import requests
from flask import request, jsonify
from sand.controllers.search import ISearch


class WikidataSearch(ISearch):

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

    def get_class_search_params(self, search_text):
        class_params = self.PARAMS.copy()
        class_params["srnamespace"] = 0
        class_params['srsearch'] = f"haswbstatement:P279 {search_text}"
        return class_params

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
        data = requests.get(self.wikidata_url, request_params)
        return data.json()

    def find_entity_by_name(self, search_text):
        request_params = self.get_entity_search_params(search_text)
        data = requests.get(self.wikidata_url, request_params)
        return data.json()['query']['search']

    def find_props_by_name(self, search_text):
        request_params = self.get_props_search_params(search_text)
        data = requests.get(self.wikidata_url, request_params)
        return data.json()['query']['search']
