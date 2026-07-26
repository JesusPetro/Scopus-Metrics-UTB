
from app.scopus.els_search import Elsearch, ElsClient

fields = [
    'dc:title', 'prism:publicationName', 'prism:volume', 'prism:issueIdentifier',
    'prism:coverDate', 'prism:doi', 'citedby-count',
    'subtypeDescription', 'author'
]

field = '?field=' + ','.join(fields)
url_base = f"https://api.elsevier.com/content/search/scopus/{field}"

params = {
    "query": "AU-ID(26325154200) AND PUBYEAR = 2025",
    "view": "STANDARD",
    "cursor": '*',
    "count": 200
}

elsClient = ElsClient()
intento = Elsearch(query=params, url=url_base)

intento.execute(els_client=elsClient, get_all=True)