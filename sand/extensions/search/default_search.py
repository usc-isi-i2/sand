from typing import List
import re
from sand.extension_interface.search import IEntitySearch, IOntologySearch
from sm.misc.funcs import import_attr
from sand.models.search import SearchResult
from sand.config import SETTINGS


class DefaultSearch(IEntitySearch, IOntologySearch):

    def __init__(self):
        self.default_classes = import_attr(SETTINGS['ont_classes']['default'])
        self.default_entities = import_attr(SETTINGS['entity']['default'])
        self.default_properties = import_attr(SETTINGS['ont_props']['default'])

    def local_search(self, default_entities: dict, search_text: str) -> List:
        """ performs local partial text search across default entities"""
        query_tokens = re.findall(r'[a-z]+|\d+', search_text.lower())
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
                uri=entity.uri
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
                uri=entity.uri
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
                uri=entity.uri
            )
            payload_results.append(item)

        return payload_results
