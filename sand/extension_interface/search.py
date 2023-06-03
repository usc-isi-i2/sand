from abc import ABC, abstractmethod


class ISearch(ABC):
    """ Search Interface to support searches from multiple
        KG datastores.
    """
    @abstractmethod
    def find_class_by_name(self):
        """Search Class using name"""
        pass

    @abstractmethod
    def find_entity_by_name(self):
        """Search Entity using name"""
        pass

    @abstractmethod
    def find_props_by_name(self):
        """Search properties using name"""
        pass
