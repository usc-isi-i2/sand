from __future__ import annotations

import re
from typing import List, Mapping, TypeVar

from dependency_injector.wiring import Provide, inject
from sand.extension_interface.search import IEntitySearch, IOntologySearch, SearchResult
from sand.models.entity import Entity
from sand.models.ontology import OntClass, OntProperty

T = TypeVar("T", Entity, OntClass, OntProperty)


class DefaultSearch(IEntitySearch, IOntologySearch):
    def __init__(
        self,
        default_entities: Mapping[str, Entity],
        default_classes: Mapping[str, OntClass],
        default_properties: Mapping[str, OntProperty],
    ):
        self.default_entities = default_entities
        self.default_classes = default_classes
        self.default_properties = default_properties

    @staticmethod
    @inject
    def create(
        default_entities: Mapping[str, Entity] = Provide["default_entities"],
        default_classes: Mapping[str, OntClass] = Provide["default_classes"],
        default_properties: Mapping[str, OntProperty] = Provide["default_properties"],
    ):
        return DefaultSearch(default_entities, default_classes, default_properties)

    def local_search(self, mapping: Mapping[str, T], search_text: str) -> list[T]:
        """performs local partial text search across default entities/classes/properties"""
        query_tokens = re.findall(r"[a-z]+|\d+", search_text.lower())
        search_results = []

        if not query_tokens:
            return search_results

        for object in mapping.values():
            label = object.label.lower()
            if all(token in label for token in query_tokens):
                search_results.append(object)

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
