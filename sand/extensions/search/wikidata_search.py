from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Union

import nh3
import requests
from sand.extension_interface.search import IEntitySearch, IOntologySearch, SearchResult
from sand.extensions.search.aggregated_search import AggregatedSearch
from sand.extensions.search.default_search import DefaultSearch
from werkzeug.exceptions import ServiceUnavailable

if TYPE_CHECKING:
    from sand.app import App


def extended_wikidata_search(app: App) -> Union[IEntitySearch, IOntologySearch]:
    """extended version of wikidata search by aggregating default search"""
    search = AggregatedSearch()
    search.add(DefaultSearch(app))
    search.add(WikidataSearch(app))
    return search


class WikidataSearch(IEntitySearch, IOntologySearch):
    def __init__(self, app: App):
        self.wikidata_url = "https://www.wikidata.org/w/api.php"
        self.PARAMS = {
            "action": "query",
            "format": "json",
            "list": "search",
            "srsearch": "",
            "utf8": "",
            "srnamespace": 0,
            "srlimit": 10,
            "srprop": "snippet|titlesnippet",
        }
        self.ont_class_ar = app.ontclass_ar
        self.app = app

    def get_class_search_params(self, search_text: str) -> Dict:
        """Updates class search parameters for wikidata API"""
        class_params = self.PARAMS.copy()
        class_params["srnamespace"] = 0
        class_params["srsearch"] = f"haswbstatement:P279 inlabel:{search_text}"
        return class_params

    def get_entity_search_params(self, search_text: str) -> Dict:
        """Updates entity search parameters for wikidata API"""
        entity_params = self.PARAMS.copy()
        entity_params["srnamespace"] = 0
        entity_params["srsearch"] = search_text
        return entity_params

    def get_props_search_params(self, search_text: str) -> Dict:
        """Updates property search parameters for wikidata API"""
        props_params = self.PARAMS.copy()
        props_params["srnamespace"] = 120
        props_params["srsearch"] = search_text
        return props_params

    def find_class_by_name(self, search_text: str) -> List[SearchResult]:
        """Uses Wikidata API to search for classes using their name/text."""
        if len(search_text.strip()) == 0:
            return []

        request_params = self.get_class_search_params(search_text)
        api_data = requests.get(self.wikidata_url, request_params)
        payload_results = []

        api_data_json = api_data.json()

        if "error" not in api_data.json():
            search_results = api_data.json()["query"]["search"]
        else:
            raise ServiceUnavailable(description=api_data_json["error"]["info"])

        for search_result in search_results:
            cls = self.ont_class_ar[search_result["title"]]
            item = SearchResult(
                label=cls.label,
                id=search_result["title"],
                description=cls.description,
                uri=self.app.id_to_uri(search_result["title"]),
            )
            payload_results.append(item)
        return payload_results

    def find_entity_by_name(self, search_text: str) -> Any:
        """Uses Wikidata API to search for entities using their name/text."""
        if len(search_text.strip()) == 0:
            return []

        request_params = self.get_entity_search_params(search_text)
        api_data = requests.get(self.wikidata_url, request_params)
        payload_results = []

        api_data_json = api_data.json()

        if "error" not in api_data_json:
            search_results = api_data_json["query"]["search"]
        else:
            raise ServiceUnavailable(description=api_data_json["error"]["info"])

        for search_result in search_results:
            item = SearchResult(
                label=nh3.clean(search_result["titlesnippet"], tags=set()),
                id=search_result["title"],
                description=nh3.clean(search_result["snippet"], tags=set()),
                uri=self.app.id_to_uri(search_result["title"]),
            )
            payload_results.append(item)
        return payload_results

    def find_props_by_name(self, search_text: str) -> List[SearchResult]:
        """Uses Wikidata API to search for properties using their name/text."""
        if len(search_text.strip()) == 0:
            return []

        request_params = self.get_props_search_params(search_text)
        api_data = requests.get(self.wikidata_url, request_params)
        payload_results = []

        api_data_json = api_data.json()

        if "error" not in api_data.json():
            search_results = api_data.json()["query"]["search"]
        else:
            raise ServiceUnavailable(description=api_data_json["error"]["info"])

        for search_result in search_results:
            item = SearchResult(
                label=nh3.clean(search_result["titlesnippet"], tags=set()),
                id=search_result["title"].split(":")[1],
                description=nh3.clean(search_result["snippet"], tags=set()),
                uri=self.app.id_to_uri(search_result["title"].split(":")[1]),
            )
            payload_results.append(item)
        return payload_results
