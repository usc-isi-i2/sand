from __future__ import annotations

from itertools import chain
from typing import Callable, Iterator, Mapping, TypeVar

from sm.namespaces.namespace import KnowledgeGraphNamespace

V = TypeVar("V")


class KGMapping(Mapping[str, V]):
    def __init__(
        self,
        main: Mapping[str, V],
        default: Mapping[str, V],
        uri_to_id: Callable[[str], str],
    ):
        self.main = main
        self.default = default
        self.uri_to_id = uri_to_id

    def __getitem__(self, key: str):
        if key in self.main:
            return self.main[key]
        return self.default[key]

    def __iter__(self) -> Iterator[str]:
        return chain(iter(self.main), iter(self.default))

    def values(self) -> Iterator[V]:
        return chain(self.main.values(), self.default.values())

    def __len__(self) -> int:
        return len(self.main) + len(self.default)

    def __contains__(self, key: str) -> bool:
        return key in self.main or key in self.default

    def get(self, key: str, default=None):
        if key in self.main:
            return self.main[key]
        return self.default.get(key, default)

    def get_by_uri(self, uri: str, default=None):
        return self.get(self.uri_to_id(uri), default)
