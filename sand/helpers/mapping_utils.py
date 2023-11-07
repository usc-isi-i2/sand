from __future__ import annotations

from itertools import chain
from typing import Iterator, Mapping, TypeVar

from sm.namespaces.namespace import KnowledgeGraphNamespace

V = TypeVar("V")


class KGMapping(Mapping[str, V]):
    def __init__(
        self,
        main: Mapping[str, V],
        default: Mapping[str, V],
        kgns: KnowledgeGraphNamespace,
    ):
        self.main = main
        self.default = default
        self.kgns = kgns

    def __getitem__(self, key: str):
        if key in self.main:
            return self.main[key]
        return self.default[key]

    def __iter__(self) -> Iterator[str]:
        return chain(iter(self.main), iter(self.default))

    def __len__(self) -> int:
        return len(self.main) + len(self.default)

    def __contains__(self, key: str) -> bool:
        return key in self.main or key in self.default

    def get(self, key: str, default=None):
        if key in self.main:
            return self.main[key]
        return self.default.get(key, default)

    def get_by_uri(self, uri: str, default=None):
        return self.get(self.kgns.uri_to_id(uri), default)
