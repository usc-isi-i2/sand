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

from smc.config import DAO_SETTINGS, import_func


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

    @staticmethod
    def uri2id(uri: str) -> str:
        """Convert entity URI to entity ID."""
        raise NotImplementedError(
            "The method is set when its store is initialized. Check the call order to ensure `EntityAR` is called first"
        )


@dataclass
class Statement:
    __slots__ = ("value", "qualifiers", "qualifiers_order")
    value: Value
    qualifiers: Dict[str, List[Value]]
    # list of qualifiers id that records the order (as dict lacks of order)
    qualifiers_order: List[str]


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
        func = import_func(cfg["constructor"])
        ENTITY_AR = func(**cfg["args"])
        Entity.uri2id = import_func(cfg["uri2id"])

    return ENTITY_AR
