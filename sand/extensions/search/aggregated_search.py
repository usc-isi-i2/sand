from typing import List, Union
from sand.extension_interface.search import IEntitySearch, IOntologySearch, SearchResult


class AggregatedSearch(IEntitySearch, IOntologySearch):

    def __init__(self):
        self.search_entity_objs = []
        self.search_ontology_objs = []

    def add(self, search_obj: Union[IEntitySearch, IOntologySearch]):
        """adds a search object to the aggregated search"""
        if isinstance(search_obj, IEntitySearch):
            self.search_entity_objs.append(search_obj)
        if isinstance(search_obj, IOntologySearch):
            self.search_ontology_objs.append(search_obj)

    def find_class_by_name(self, search_text: str) -> List[SearchResult]:
        """Performs generic class search based on name"""
        payload_results = []
        for search_obj in self.search_ontology_objs:
            payload_results += search_obj.find_class_by_name(search_text)
        return payload_results

    def find_entity_by_name(self, search_text: str) -> List[SearchResult]:
        """Performs generic entity search based on name"""
        payload_results = []
        for search_obj in self.search_entity_objs:
            payload_results += search_obj.find_entity_by_name(search_text)
        return payload_results

    def find_props_by_name(self, search_text: str) -> List[SearchResult]:
        """Performs generic property search based on name"""
        payload_results = []
        for search_obj in self.search_ontology_objs:
            payload_results += search_obj.find_props_by_name(search_text)
        return payload_results
