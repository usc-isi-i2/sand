from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, List, Literal, Union
from kgdata.wikidata.models.wdvalue import (
    ValueGlobeCoordinate,
    ValueMonolingualText,
    ValueQuantity,
    ValueTime,
)
from kgdata.wikidata.models.multilingual import (
    MultiLingualString,
    MultiLingualStringList,
)

from sand.config import SETTINGS
from sm.misc.funcs import import_func


# represent that there is no entity
NIL_ENTITY = SETTINGS["entity"]["nil"]


@dataclass
class Entity:
    id: str
    label: MultiLingualString
    aliases: MultiLingualStringList
    description: MultiLingualString
    properties: Dict[str, List[Statement]]

    @property
    def readable_label(self):
        return self.label

    @property
    def instanceof(self):
        """Get the property representing the instanceof relation."""
        raise NotImplementedError()

    @staticmethod
    def uri2id(uri: str) -> str:
        """Convert entity URI to entity ID."""
        raise NotImplementedError(
            "The method is set when its store is initialized. Check the call order to ensure `EntityAR` is called first"
        )

    @staticmethod
    def id2uri(id: str) -> str:
        """Convert entity ID to entity URI."""
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
        ValueGlobeCoordinate,
        ValueQuantity,
        ValueTime,
        ValueMonolingualText,
    ]

    def is_entity_id(self):
        return self.type == "entityid"


ENTITY_AR = None
DEFAULT_ENTITY = {
    NIL_ENTITY: Entity(
        id=NIL_ENTITY,
        label=MultiLingualString.en("NIL"),
        aliases=MultiLingualStringList(lang2values={"en": []}, lang="en"),
        description=MultiLingualString.en("the correct entity is absent in KG"),
        properties={},
    )
}


def check_nil(fn: Callable[[str], str]):
    def wrapper(x: str) -> str:
        return fn(x) if x != NIL_ENTITY else NIL_ENTITY

    return wrapper


def EntityAR() -> Dict[str, Entity]:
    global ENTITY_AR

    if ENTITY_AR is None:
        cfg = SETTINGS["entity"]
        func = import_func(cfg["constructor"])
        ENTITY_AR = func(**cfg["args"])
        Entity.uri2id = check_nil(import_func(cfg["uri2id"]))
        Entity.id2uri = check_nil(import_func(cfg["id2uri"]))

    return ENTITY_AR
