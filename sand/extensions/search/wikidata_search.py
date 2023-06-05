import requests
from flask import request, jsonify
import nh3
from sand.controllers.search import ISearch
from sand.models.entity import Entity
from sand.models.ontology import OntClass, OntProperty

class WikidataSearch(ISearch):

    def __init__(self):
        self.wikidata_url = "https://www.wikidata.org/w/api.php"
        self.local_class_idsearch_uri = "http://0.0.0.0:5525/api/classes/"
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
        self.search_item_template = {
            "label": "",
            "id": "",
            "description": "",
            "uri": "",
        }

    def get_class_search_params(self, search_text):
        class_params = self.PARAMS.copy()
        class_params["srnamespace"] = 0
        class_params['srsearch'] = f"haswbstatement:P279 {search_text}"
        return class_params

    def get_local_class_properties(self, id):
        api_data = requests.get(self.local_class_idsearch_uri+str(id))
        return api_data.json()

    def get_entity_search_params(self, search_text):
        entity_params = self.PARAMS.copy()
        entity_params["srnamespace"] = 0
        entity_params['srsearch'] = search_text
        return entity_params

    def get_props_search_params(self, search_text):
        props_params = self.PARAMS.copy()
        props_params["srnamespace"] = 120
        props_params['srsearch'] = search_text
        return props_params

    def find_class_by_name(self, search_text):
        request_params = self.get_class_search_params(search_text)
        api_data = requests.get(self.wikidata_url, request_params)
        search_items = api_data.json()['query']['search']
        payload = {"items": []}
        for search_item in search_items:
            item = self.search_item_template.copy()
            item['id'] = search_item['title']
            local_class_props = self.get_local_class_properties(item['id'])
            item['label'] = local_class_props['label']
            item['description'] = local_class_props['description']
            item['uri'] = OntClass.id2uri(item['id'])
            payload['items'].append(item)
        return payload

    def find_entity_by_name(self, search_text):
        request_params = self.get_entity_search_params(search_text)
        api_data = requests.get(self.wikidata_url, request_params)
        search_items = api_data.json()['query']['search']
        payload = {"items":[]}
        for search_item in search_items:
            item = self.search_item_template.copy()
            item['label'] = nh3.clean(search_item['titlesnippet'], tags=set())
            item['id'] = search_item['title']
            item['description'] = nh3.clean(search_item['snippet'], tags=set())
            item['uri'] = Entity.id2uri(item['id'])
            payload['items'].append(item)
        return payload

    def find_props_by_name(self, search_text):
        request_params = self.get_props_search_params(search_text)
        api_data = requests.get(self.wikidata_url, request_params)
        search_items = api_data.json()['query']['search']
        payload = {"items": []}
        for search_item in search_items:
            item = self.search_item_template.copy()
            item['label'] = nh3.clean(search_item['titlesnippet'], tags=set())
            item['id'] = search_item['title'].split(":")[1]
            item['description'] = nh3.clean(search_item['snippet'], tags=set())
            item['uri'] = OntProperty.id2uri(item['id'])
            payload['items'].append(item)
        return payload
