from abc import ABC, abstractmethod
from typing import Dict
from sand.models.search import SearchPayload


class IEntitySearch(ABC):
    """ Entity Search Interface to support searches from multiple
        KG datastores.
    """
    @abstractmethod
    def find_entity_by_name(self, search_text: str) -> SearchPayload:
        """Search Entity using name"""
        pass


class IOntologySearch(ABC):
    """ Class and Property Ontology Search Interface to support searches from multiple
        KG datastores.
    """

    @abstractmethod
    def find_class_by_name(self, search_text: str) -> SearchPayload:
        """Search Class using name"""
        pass

    @abstractmethod
    def find_props_by_name(self, search_text: str) -> SearchPayload:
        """Search properties using name"""
        pass