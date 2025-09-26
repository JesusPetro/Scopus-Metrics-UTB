
from pathlib import Path
from typing import Any, Dict, List, Optional

import json
import pandas as pd
import app.core.logging as log_util
# from __init__ import version, log_to_directory


logger = log_util.get_logger(__name__)

fields = {
    'authors_info': 'Authors',
    'authors_info_with_id': 'Author full names',
    'authors_id': 'Author(s) ID',
    'dc:title': 'Title',
    'prism:coverDate': 'Date',
    'prism:volume': 'Volume',
    'prism:issueIdentifier': 'Issue',
    'citedby-count': 'Cited by',
    'prism:doi': 'DOI',
    'subtypeDescription': 'Document Type'
}

class ElsevierSchemaError(RuntimeError):
    """It notes that the JSON response does not meet the contract expected from Elsevier/Scopus."""


class Elsjson: 
    """
    Parser/normalizer for Elsevier/Scopus Search Results JSON responses.

    Assumed contract (stable API):
    - The root must contain the key 'search-results' (dict).
    - 'search-results' must contain 'entry' (list of dicts). May be an empty list.
    - Each 'entry' contains metadata of the result (title, authors, etc.).

    Typical usage:
    parser = ElsevierSearchJSONParser(file_path="response.json", fields_map=FIELDS)
    df = parser.run()

    Parameters
    ----------
    file_path : str | Path | None
        Path to the local JSON file (when processing from disk).
    encoding : str
        Encoding of the JSON file (default 'utf-8').
    """

    def __init__(
        self, 
        path: Optional[str | Path] = None, 
        encoding: str = 'utf-8'
    ) -> None:
        self.path: Optional[Path] = Path(path) if path else None
        self._data: Optional[Dict[str, Any]] = None
        self.encoding: str = encoding


    @property
    def path(self):
        """ Gets the path"""
        if not self._path:
            raise AttributeError("path has not been loaded yet. Call self.path = Path(...)")
        return self._path
    
    @path.setter
    def path(self, path):
        """ Sets the path"""
        self._path = Path(path)

    @property
    def data(self):
        """Returns the parsed JSON data as a Python object (dict or list)."""
        if not self._data:
            raise AttributeError(
                "JSON data has not been loaded yet. Call load() or from_dict() first."
            )
        return self._data

    @data.setter
    def data(self, data):
        self._data = data
        self._validate_data()

    def load(self) -> None:
        """
        Reads the JSON file from the local path (used only when the file 
        is stored locally instead of in a database).
        """
        path = self.path
        logger.info("Reading Elsevier's JSON from %s", path)

        with path.open('r', encoding = 'utf-8') as f:
            self.data = json.load(f)

    def from_dict(self, payload: Dict[str, Any]) -> None:
        """
        Directly injects a JSON dict (e.g. request response).
        """
        self.data = payload

    def _validate_data(self) -> None:
        """
        Lightweight validation based on the API contract:
        - 'search-results' must exist and be a dict.
        - 'entry' must exist (list, possibly empty) or be coercible to one.
        """

        _ = len(self.data)

        if _ is None:
            logger.warning(
                "Elsevier response with no results: 0 data."
            )

    @staticmethod
    def preprocess_author(authors):
        return ';'.join(f'{auth["authname"]}' for auth in authors)

    @staticmethod
    def preprocess_author_with_id(authors):
        return ';'.join(f'{auth["authname"]} ({auth["authid"]})' for auth in authors)
    
    @staticmethod
    def preprocess_authorid(authors):
        return ';'.join(f'{auth["authid"]}' for auth in authors)

    def _enrich_entries(self, entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        enriched: List[Dict[str, Any]] = []

        for e in entries: 
            authors = e.get("author") or []
            copy_e = dict(e)

            copy_e['authors_id'] = self.preprocess_authorid(authors)
            copy_e['authors_info'] = self.preprocess_author(authors)
            copy_e['authors_info_with_id'] = self.preprocess_author_with_id(authors)
            enriched.append(copy_e)

        return enriched

    def to_dataframe(self) -> pd.DataFrame:
        """
        Normalise 'entries' to DataFrame, apply enrichments and renames.
        Returns empty DataFrame (with expected columns if there are fields_map) when there are no results.
        """

        entries = len(self._data)
        if not entries: 
            logger.info("Elsevier response with no results: 0 entries.")
            if fields:
                return pd.DataFrame(columns=list(fields.values()))
            return pd.DataFrame()
        
        logger.info("Normalising %d entries from Elsevier.", entries)
        enriched = self._enrich_entries(self.data)
        df = pd.json_normalize(enriched)

        if fields:
            original_cols = set(df.columns)
            wanted = set(fields.keys())
            not_mapped = original_cols - wanted
            missing_in_df = wanted - original_cols

            if not_mapped:
                logger.info(
                    "Columns present and not mapped (to be ignored): %s",
                    ", ".join(sorted(map(str, not_mapped)))
                )
            if missing_in_df:
                logger.info(
                    "Expected columns in fields_map that did NOT arrive: %s",
                    ", ".join(sorted(map(str, missing_in_df))) 
                )

        keep_cols = [c for c in df.columns if c in fields]
        df = df[keep_cols].rename(columns=fields)

        return df

    def execute(self) -> pd.DataFrame:
        """
        Run the entire pipeline assuming local file input:
        load() → validate contract → enrich → normalise → rename/filter → DataFrame.
        """
        if self._data is None:
            self.load()
        return self.to_dataframe()