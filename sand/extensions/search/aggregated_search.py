from typing import List, Union
from sand.extension_interface.search import IEntitySearch, IOntologySearch
from sand.models.search import SearchResult
from sand.extensions.search.default_search import DefaultSearch
from sand.extensions.search.wikidata_search import WikidataSearch


class AggregatedSearch(IEntitySearch, IOntologySearch):

    def __init__(self):
        self.search_objs = []

    def add(self, search_obj: Union[IEntitySearch, IOntologySearch]):
        """adds a search object to the aggregated search"""
        self.search_objs.append(search_obj)

    def extended_wikidata_search(self) -> Union[IEntitySearch,IOntologySearch]:
        """extended version of wikidata search by aggregating default search"""
        search = AggregatedSearch()
        search.add(DefaultSearch())
        search.add(WikidataSearch())
        return search

    def find_class_by_name(self, search_text: str) -> List[SearchResult]:
        """Performs generic class search based on name"""
        payload_results = []
        for search_obj in self.search_objs:
            payload_results += search_obj.find_class_by_name(search_text)
        return payload_results

    def find_entity_by_name(self, search_text: str) -> List[SearchResult]:
        """Performs generic entity search based on name"""
        payload_results = []
        for search_obj in self.search_objs:
            payload_results += search_obj.find_entity_by_name(search_text)
        return payload_results

    def find_props_by_name(self, search_text: str) -> List[SearchResult]:
        """Performs generic property search based on name"""
        payload_results = []
        for search_obj in self.search_objs:
            payload_results += search_obj.find_props_by_name(search_text)
        return payload_results
