from __future__ import annotations

import enum
import importlib
from dataclasses import dataclass
from typing import Dict, List, Literal, Union, Optional
from kgdata.wikidata.models.qnode import (
    DataValueGlobeCoordinate,
    DataValueMonolingualText,
    DataValueQuantity,
    DataValueTime,
    MultiLingualStringList,
)

from smc.config import DAO_SETTINGS


MultiLingualString = Dict[str, str]
MultiLingualStringList = Dict[str, List[str]]


@dataclass
class Entity:
    id: str
    label: MultiLingualString
    aliases: MultiLingualStringList
    description: MultiLingualString
    properties: Dict[str, List[Statement]]

    @property
    def readable_label(self):
        return self.label.get("en", "")


@dataclass
class Statement:
    __slots__ = ("value", "qualifiers", "qualifiers_order")
    value: Value
    qualifiers: Dict[str, List[Value]]
    qualifiers_order: List[int]


@dataclass
class Value:
    __slots__ = ("type", "value")
    type: Literal[
        "string", "time", "quantity", "globecoordinate", "entityid", "monolingualtext"
    ]
    value: Union[
        str,
        DataValueGlobeCoordinate,
        DataValueQuantity,
        DataValueTime,
        DataValueMonolingualText,
    ]


ENTITY_AR = None


def EntityAR() -> Dict[str, Entity]:
    global ENTITY_AR

    if ENTITY_AR is None:
        cfg = DAO_SETTINGS["entity"]
        module, func = cfg["constructor"].rsplit(".", 1)
        func = getattr(importlib.import_module(module), func)
        ENTITY_AR = func(**cfg["args"])

    return ENTITY_AR
