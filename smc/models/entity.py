import enum
import importlib
from dataclasses import dataclass
from typing import Dict, List, Union, Optional

from smc.config import DAO_SETTINGS
from smc.models.base import Singleton


class ValueType(enum.Enum):
    URI = "uri"
    String = "string"
    Integer = "integer"
    Float = "float"


@dataclass
class Value:
    __slots__ = ("type", "value")
    # uri, string, integer, float
    type: ValueType
    value: Union[str, int, float]

    def is_uri(self):
        return self.type == ValueType.URI

    def as_uri(self):
        if self.type == ValueType.URI:
            return self.value
        assert f"Cannot convert value of type {self.type} to URI"


@dataclass
class Statement:
    __slots__ = ("value", "qualifiers")
    value: Value
    qualifiers: Dict[str, List[Value]]


@dataclass
class Entity:
    __slots__ = ("uri", "label", "description", "properties")

    # id or uri of the entity
    uri: str
    label: str
    description: str
    properties: Dict[str, List[Statement]]

    @property
    def readable_label(self):
        return self.label


ENTITY_AR = None


def EntityAR() -> Dict[str, Entity]:
    global ENTITY_AR

    if ENTITY_AR is None:
        cfg = DAO_SETTINGS["entity"]
        module, func = cfg["constructor"].rsplit(".", 1)
        func = getattr(importlib.import_module(module), func)
        ENTITY_AR = func(**cfg["args"])

    return ENTITY_AR
