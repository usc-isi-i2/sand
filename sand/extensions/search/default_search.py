from typing import List
from sand.extension_interface.search import IEntitySearch, IOntologySearch
from sm.misc.funcs import import_attr
from sand.models.search import SearchResult
from sand.config import SETTINGS


class DefaultSearch(IEntitySearch, IOntologySearch):

    def local_search(self, default_entities: dict, search_text: str) -> List:
        """ performs local partial text search across default entities"""
        query_tokens = search_text.split(" ")
        search_results = []
        for key, entity in default_entities.items():
            if all(list(map(lambda x: x.lower() in entity.label.lower(), query_tokens))):
                search_results.append(entity)
        return search_results

    def find_class_by_name(self, search_text: str) -> List[SearchResult]:
        """Uses local default classes to search for entities using their name/text."""
        constructor = SETTINGS['ont_classes']['default']
        default_classes = import_attr(constructor)
        local_search_results = self.local_search(default_classes, search_text)
        payload_results = []

        for entity in local_search_results:
            item = SearchResult(
                label=entity.label,
                id=entity.id,
                description=entity.description,
                uri=entity.uri
            )
            payload_results.append(item)

        return payload_results

    def find_entity_by_name(self, search_text: str) -> List[SearchResult]:
        """Uses local default entities to search for entities using their name/text."""
        constructor = SETTINGS['entity']['default']
        default_entities = import_attr(constructor)
        local_search_results = self.local_search(default_entities, search_text)
        payload_results = []

        for entity in local_search_results:
            item = SearchResult(
                label=entity.label,
                id=entity.id,
                description=entity.description,
                uri=entity.uri
            )
            payload_results.append(item)

        return payload_results

    def find_props_by_name(self, search_text: str) -> List[SearchResult]:
        """Uses local default properties to search for entities using their name/text."""
        # search local properties
        constructor = SETTINGS['ont_props']['default']
        default_properties = import_attr(constructor)
        local_search_results = self.local_search(default_properties, search_text)
        payload_results = []

        for entity in local_search_results:
            item = SearchResult(
                label=entity.label,
                id=entity.id,
                description=entity.description,
                uri=entity.uri
            )
            payload_results.append(item)

        return payload_results
