from __future__ import annotations

from typing import Generic, Literal, TypeVar

from sand.config import FnConfig
from sm.misc.funcs import import_func

T = TypeVar("T")


class MultiServiceProvider(Generic[T]):
    def __init__(self, cfg: FnConfig):
        self.cfg = cfg
        self.services: dict[str, T] = {}

    def get_default(self) -> T:
        return self.get("default")

    def get(self, name: Literal["default"] | str) -> T:
        if name not in self.services:
            fnconstructor = self.cfg.get_func(name)
            if isinstance(fnconstructor, str):
                fn = import_func(fnconstructor)()
            else:
                fn = import_func(fnconstructor["constructor"])(
                    **fnconstructor.get("args", {})
                )
            self.services[name] = fn
        return self.services[name]

    def get_available_providers(self) -> list[str]:
        return list(self.cfg.funcs.keys())


def get_service(path: str):
    return import_func(path)()
