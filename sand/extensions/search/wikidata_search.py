import requests
from typing import Dict, List
import nh3
from sand.extension_interface.search import IEntitySearch, IOntologySearch
from sand.models.entity import Entity
from sand.models.ontology import OntClass, OntProperty, OntClassAR
from sand.models.search import SearchResult
from sm.misc.funcs import import_attr
from sand.config import SETTINGS


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
        self.ont_class_ar = None

    def get_class_search_params(self, search_text: str) -> Dict:
        """Updates class search parameters for wikidata API"""
        class_params = self.PARAMS.copy()
        class_params["srnamespace"] = 0
        class_params['srsearch'] = f"haswbstatement:P279 inlabel:{search_text}"
        return class_params

    def local_search(self, default_entities: dict, search_text: str) -> List:
        """ performs local partial text search across default entities"""
        query_tokens = search_text.split(" ")
        search_results = []
        for key, entity in default_entities.items():
            if all(list(map(lambda x: x.lower() in entity.label.lower(), query_tokens))):
                search_results.append(entity)
        return search_results

    def get_local_class_properties(self, id: str) -> OntClass:
        """Calls local class search API to fetch all class metadata using class ID"""
        if self.ont_class_ar is None:
            self.ont_class_ar = OntClassAR()
        return self.ont_class_ar[id]

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

    def find_class_by_name(self, search_text: str) -> List[SearchResult]:
        """
        Uses Wikidata API and local default classes to search for classes using their name/text.
        """
        request_params = self.get_class_search_params(search_text)
        api_data = requests.get(self.wikidata_url, request_params)
        search_results = api_data.json()['query']['search']
        payload_results = []

        # search local classes
        constructor = SETTINGS['ont_classes']['default']
        default_classes = import_attr(constructor)
        local_search_results = self.local_search(default_classes, search_text)

        for entity in local_search_results:
            item = SearchResult(
                label=entity.label,
                id=entity.id,
                description=entity.description,
                uri=entity.uri
            )
            payload_results.append(item)

        # search wikidata
        for search_result in search_results:
            local_class_props = self.get_local_class_properties(search_result['title'])
            item = SearchResult(
                label=local_class_props.label,
                id=search_result['title'],
                description=local_class_props.description,
                uri=OntClass.id2uri(search_result['title'])
            )
            payload_results.append(item)
        return payload_results

    def find_entity_by_name(self, search_text: str) -> List[SearchResult]:
        """Uses Wikidata API and local default entities to search for entities using their name/text."""
        request_params = self.get_entity_search_params(search_text)
        api_data = requests.get(self.wikidata_url, request_params)
        search_results = api_data.json()['query']['search']
        payload_results = []

        # search local entities
        constructor = SETTINGS['entity']['default']
        default_entities = import_attr(constructor)
        local_search_results = self.local_search(default_entities, search_text)

        for entity in local_search_results:
            item = SearchResult(
                label=entity.label,
                id=entity.id,
                description=entity.description,
                uri=entity.uri
            )
            payload_results.append(item)

        # search wikidata
        for search_result in search_results:
            item = SearchResult(
                label=nh3.clean(search_result['titlesnippet'], tags=set()),
                id=search_result['title'],
                description=nh3.clean(search_result['snippet'], tags=set()),
                uri=Entity.id2uri(search_result['title'])
            )
            payload_results.append(item)
        return payload_results

    def find_props_by_name(self, search_text: str) -> List[SearchResult]:
        """Uses Wikidata API and local default properties to search for properties using their name/text."""
        request_params = self.get_props_search_params(search_text)
        api_data = requests.get(self.wikidata_url, request_params)
        search_results = api_data.json()['query']['search']
        payload_results = []

        # search local properties
        constructor = SETTINGS['ont_props']['default']
        default_properties = import_attr(constructor)
        local_search_results = self.local_search(default_properties, search_text)

        for entity in local_search_results:
            item = SearchResult(
                label=entity.label,
                id=entity.id,
                description=entity.description,
                uri=entity.uri
            )
            payload_results.append(item)

        # search wikidata
        for search_result in search_results:
            item = SearchResult(
                label=nh3.clean(search_result['titlesnippet'], tags=set()),
                id=search_result['title'].split(":")[1],
                description=nh3.clean(search_result['snippet'], tags=set()),
                uri=OntProperty.id2uri(search_result['title'].split(":")[1])
            )
            payload_results.append(item)
        return payload_results
