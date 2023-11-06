import re
from typing import List

from sand.config import APP_CONFIG
from sand.extension_interface.search import IEntitySearch, IOntologySearch, SearchResult
from sm.misc.funcs import import_attr


class DefaultSearch(IEntitySearch, IOntologySearch):
    def __init__(self):
        self.default_classes = import_attr(APP_CONFIG.clazz.default)
        self.default_entities = import_attr(APP_CONFIG.entity.default)
        self.default_properties = import_attr(APP_CONFIG.property.default)

    def local_search(self, default_entities: dict, search_text: str) -> List:
        """performs local partial text search across default entities"""
        query_tokens = re.findall(r"[a-z]+|\d+", search_text.lower())
        search_results = []

        if not query_tokens:
            return search_results

        for entity in default_entities.values():
            label = entity.label.lower()
            if all(token in label for token in query_tokens):
                search_results.append(entity)
        return search_results

    def find_class_by_name(self, search_text: str) -> List[SearchResult]:
        """Uses local default classes to search for entities using their name/text."""
        local_search_results = self.local_search(self.default_classes, search_text)
        payload_results = []

        for entity in local_search_results:
            item = SearchResult(
                label=entity.label,
                id=entity.id,
                description=entity.description,
                uri=entity.uri,
            )
            payload_results.append(item)

        return payload_results

    def find_entity_by_name(self, search_text: str) -> List[SearchResult]:
        """Uses local default entities to search for entities using their name/text."""
        local_search_results = self.local_search(self.default_entities, search_text)
        payload_results = []

        for entity in local_search_results:
            item = SearchResult(
                label=entity.label,
                id=entity.id,
                description=entity.description,
                uri=entity.uri,
            )
            payload_results.append(item)

        return payload_results

    def find_props_by_name(self, search_text: str) -> List[SearchResult]:
        """Uses local default properties to search for entities using their name/text."""
        local_search_results = self.local_search(self.default_properties, search_text)
        payload_results = []

        for entity in local_search_results:
            item = SearchResult(
                label=entity.label,
                id=entity.id,
                description=entity.description,
                uri=entity.uri,
            )
            payload_results.append(item)

        return payload_results
