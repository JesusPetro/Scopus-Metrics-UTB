import requests, json, time
import app.core.logging as log_util

from pathlib import Path
from ElsClient import ElsClient
# from dotenv import load_dotenv
# from app.core.config import loggin
from typing import Any, Dict, List, Optional


logger = log_util.get_logger(__name__)
# loggin.log_to_directory("logs")
# load_dotenv()


class Elsearch():

    #TODO: Pasar todo esto a un .env
    __url_base = 'https://api.elsevier.com/content/search/scopus/'

    def __init__(self, query: Dict[str, Any], url: str = None) -> None:
        self.query = query
        self._uri = url if url else self.__url_base
        

    @property
    def query(self):
        return self._query
    
    @query.setter
    def query(self, query: Dict[str, Any]): 
        self._query = query

    @property
    def results(self):
        return self._results
    
    @results.setter
    def results(self, results):
        self._results = results

    @property
    def tot_num_res(self):
        return self._tot_num_res
    
    @tot_num_res.setter
    def tot_num_res(self, tot_num_res):
        self._tot_num_res = tot_num_res
    
    @property
    def num_res(self):
        return len(self.results)

    def execute(
            self,
            els_client = None,
            get_all: bool = False,
            view = None,
    ):

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