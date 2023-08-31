from abc import ABC, abstractmethod
from typing import List
from dataclasses import dataclass


@dataclass
class SearchResult:
    """
    Search Result dataclass to save the values of each search result in a search
    """
    label: str
    id: str
    description: str
    uri: str


class IEntitySearch(ABC):
    """ Entity Search Interface to support searches from multiple
        KG datastores.
    """

    @abstractmethod
    def find_entity_by_name(self, search_text: str) -> List[SearchResult]:
        """Search Entity using name"""
        pass


class IOntologySearch(ABC):
    """ Class and Property Ontology Search Interface to support searches from multiple
        KG datastores.
    """

    @abstractmethod
    def find_class_by_name(self, search_text: str) -> List[SearchResult]:
        """Search Class using name"""
        pass

    @abstractmethod
    def find_props_by_name(self, search_text: str) -> List[SearchResult]:
        """Search properties using name"""
        pass
