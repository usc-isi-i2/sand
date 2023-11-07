from __future__ import annotations

from typing import Generic, Literal, TypeVar

from sm.misc.funcs import import_func

from sand.config import FnConfig

T = TypeVar("T")


class MultiServiceProvider(Generic[T]):
    def __init__(self, cfg: FnConfig):
        self.cfg = cfg
        self.services: dict[str, T] = {}

    def get_default(self) -> T:
        return self.get("default")

    def get(self, name: Literal["default"] | str) -> T:
        if name not in self.services:
            self.services[name] = import_func(self.cfg.get_func(name))()
        return self.services[name]

    def get_available_providers(self) -> list[str]:
        return list(self.cfg.funcs.keys())


def get_service(path: str):
    return import_func(path)()
