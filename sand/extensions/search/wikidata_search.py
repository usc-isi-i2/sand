import requests
from typing import Dict
import nh3
from sand.extension_interface.search import IEntitySearch, IOntologySearch
from sand.models.entity import Entity
from sand.models.ontology import OntClass, OntProperty, OntClassAR
from sand.models.search import SearchItem, SearchPayload


class WikidataSearch(IEntitySearch, IOntologySearch):

    def __init__(self):
        self.wikidata_url = "https://www.wikidata.org/w/api.php"
        self.PARAMS = {
            "action": "query",
            "format": "json",
            "list": "search",
            "srsearch": "",
            "utf8": "",
            "srnamespace": 0,
            "srlimit": 10,
            "srprop": "snippet|titlesnippet"
        }

    def get_class_search_params(self, search_text: str) -> Dict:
        """Updates class search parameters for wikidata API"""
        class_params = self.PARAMS.copy()
        class_params["srnamespace"] = 0
        class_params['srsearch'] = f"haswbstatement:P279 {search_text}"
        return class_params

    def get_local_class_properties(self, id: str) -> OntClass:
        """Calls local class search API to fetch all class metadata using class ID"""
        return OntClassAR()[id]

    def get_entity_search_params(self, search_text: str) -> Dict:
        """Updates entity search parameters for wikidata API"""
        entity_params = self.PARAMS.copy()
        entity_params["srnamespace"] = 0
        entity_params['srsearch'] = search_text
        return entity_params

    def get_props_search_params(self, search_text: str) -> Dict:
        """Updates property search parameters for wikidata API"""
        props_params = self.PARAMS.copy()
        props_params["srnamespace"] = 120
        props_params['srsearch'] = search_text
        return props_params

    def find_class_by_name(self, search_text: str) -> SearchPayload:
        """
        Uses Wikidata API to search for classes using their name/text.
        Uses local ID based class search to fetch label and description data.
        """
        request_params = self.get_class_search_params(search_text)
        api_data = requests.get(self.wikidata_url, request_params)
        search_items = api_data.json()['query']['search']
        payload_items = []
        for search_item in search_items:
            local_class_props = self.get_local_class_properties(search_item['title'])
            item = SearchItem(
                label=local_class_props.label,
                id=search_item['title'],
                description=local_class_props.description,
                uri=OntClass.id2uri(search_item['title'])
            )
            payload_items.append(item)
        payload = SearchPayload(payload_items)
        return payload

    def find_entity_by_name(self, search_text: str) -> SearchPayload:
        """Uses Wikidata API to search for entities using their name/text."""
        request_params = self.get_entity_search_params(search_text)
        api_data = requests.get(self.wikidata_url, request_params)
        search_items = api_data.json()['query']['search']
        payload_items = []
        for search_item in search_items:
            item = SearchItem(
                label=nh3.clean(search_item['titlesnippet'], tags=set()),
                id=search_item['title'],
                description=nh3.clean(search_item['snippet'], tags=set()),
                uri=Entity.id2uri(search_item['title'])
            )
            payload_items.append(item)
        payload = SearchPayload(payload_items)
        return payload

    def find_props_by_name(self, search_text: str) -> SearchPayload:
        """Uses Wikidata API to search for properties using their name/text."""
        request_params = self.get_props_search_params(search_text)
        api_data = requests.get(self.wikidata_url, request_params)
        search_items = api_data.json()['query']['search']
        payload_items = []
        for search_item in search_items:
            item = SearchItem(
                label=nh3.clean(search_item['titlesnippet'], tags=set()),
                id=search_item['title'].split(":")[1],
                description=nh3.clean(search_item['snippet'], tags=set()),
                uri=OntProperty.id2uri(search_item['title'].split(":")[1])
            )
            payload_items.append(item)
        payload = SearchPayload(payload_items)
        return payload
