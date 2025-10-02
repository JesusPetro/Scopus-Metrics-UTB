import requests, json, time
import app.core.logging as log_util

from pathlib import Path
from els_client import ElsClient
from typing import Any, Dict, List, Optional


logger = log_util.get_logger(__name__)



class Elsearch():

    #TODO: Pasar todo esto a un .env
    __url_base = 'https://api.elsevier.com/content/search/scopus/'

    def __init__(self, query: Dict[str, Any], url: str = None) -> None:
        self.query = query
        self._uri = url if url else self.__url_base
        

    @property
    def query(self) -> Dict[str, Any]:
        """Get the query parameters used for the request."""
        return self._query

    @query.setter
    def query(self, query: Dict[str, Any]) -> None:
        """Set the query parameters for the request."""
        self._query = query

    @property
    def results(self) -> list[dict[str, Any]]:
        """Get the API results."""
        return self._results

    @results.setter
    def results(self, results: list[dict[str, Any]]) -> None:
        """Set the API results."""
        self._results = results

    @property
    def tot_num_res(self) -> int:
        """Get the total number of results available (reported by API)."""
        return self._tot_num_res

    @tot_num_res.setter
    def tot_num_res(self, tot_num_res: int) -> None:
        """Set the total number of results available (reported by API)."""
        self._tot_num_res = tot_num_res

    @property
    def num_res(self) -> int:
        """Get the number of results currently stored in `results`."""
        return len(self.results)

    def execute(
            self,
            els_client = None,
            get_all: bool = False,
            view = None,
    ):

        """
        Execute a Scopus/Elsevier search request and store the results.

        This method sends the query to the Elsevier API, retrieves the first page 
        of results, and optionally fetches all additional pages if `get_all` is True. 
        Results are stored in the `results` property and the total number of results 
        is set in `tot_num_res`.

        Args:
            els_client: The Elsevier API client instance used to execute requests.
            get_all (bool, optional): If True, retrieve all pages of results. 
                Defaults to False.
            view (str, optional): API view parameter to customize the response fields. 
                If provided, it is appended to the request URL.

        Side Effects:
            - Updates `self.results` with the list of entries.
            - Updates `self.tot_num_res` with the reported total number of results.
            - Writes the collected results into a local JSON file (`scopusv2.json`).
            - Logs progress and success message.

        Raises:
            ScopusConnectionError: If an error occurs while calling the API.
            ScopusResponseError: If the API response is invalid or unexpected.
        """
                
        if view: 
            url += f'&view={view}'
        
        api_response = els_client.exec_request(self._uri, self.query)
        search_results = api_response["search-results"]

        self.tot_num_res = int(search_results["opensearch:totalResults"])
        self.results = search_results.get("entry", [])
        
        pages_done = 1
        if get_all:
            while True:
                next_url = None
                for e in search_results.get("link", []):
                    if e["@ref"] == "next":
                        next_url = e["@href"]

                if not next_url:
                    break  

                api_response = els_client.exec_request(next_url)
                search_results = api_response["search-results"]
                entries = search_results.get('entry', []) or []

                if not entries:
                    break

                self.results.extend(entries)
                pages_done+=1

        logger.info(f"Process finished successfully with {len(self.results)} results and {pages_done} pages")
        
        
        with open('scopusv2.json', 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=4)
        



if __name__ == '__main__':
    fields = ['dc:title', 'prism:publicationName', 'prism:volume', 'prism:issueIdentifier',
          'prism:coverDate', 'prism:doi', 'citedby-count',
          'subtypeDescription', 'author']

    field = '?field=' + ','.join(fields)

    url_base = f"https://api.elsevier.com/content/search/scopus/{field}"

    params = {
        "query": "AF-ID ( 60103889 )",
        "view": "STANDARD",
        "cursor": '*',
        "count": 200
    }

    elsClient = ElsClient()
    intento = Elsearch(query=params, url=url_base)

    intento.execute(els_client=elsClient, get_all=True)