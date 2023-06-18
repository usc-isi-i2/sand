from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Mapping, Optional, Union

from hugedict.chained_mapping import ChainedMapping
from kgdata.wikidata.models.multilingual import (
    MultiLingualString,
    MultiLingualStringList,
)
from kgdata.wikidata.models.wdvalue import (
    ValueGlobeCoordinate,
    ValueMonolingualText,
    ValueQuantity,
    ValueTime,
)
from sm.misc.funcs import import_attr, import_func

from sand.config import SETTINGS

# represent that there is no entity
NIL_ENTITY_ID = SETTINGS["entity"]["nil"]["id"]
NIL_ENTITY_URI = SETTINGS["entity"]["nil"]["uri"]


@dataclass
class Entity:
    id: str
    uri: str
    label: MultiLingualString
    aliases: MultiLingualStringList
    description: MultiLingualString
    properties: dict[str, list[Statement]]

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
    qualifiers: dict[str, list[Value]]
    # list of qualifiers id that records the order (as dict lacks of order)
    qualifiers_order: list[str]


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


ENTITY_AR: Optional[Mapping[str, Entity]] = None
DEFAULT_ENTITY = {
    NIL_ENTITY_ID: Entity(
        id=NIL_ENTITY_ID,
        uri=NIL_ENTITY_URI,
        label=MultiLingualString.en("NIL"),
        aliases=MultiLingualStringList(lang2values={"en": []}, lang="en"),
        description=MultiLingualString.en("the correct entity is absent in KG"),
        properties={},
    )
}


def EntityAR() -> Mapping[str, Entity]:
    global ENTITY_AR

    if ENTITY_AR is None:
        cfg = SETTINGS["entity"]
        func = import_func(cfg["constructor"])
        ENTITY_AR = ChainedMapping(func(**cfg["args"]), import_attr(cfg["default"]))
        Entity.uri2id = import_func(cfg["uri2id"])
        Entity.id2uri = import_func(cfg["id2uri"])

    return ENTITY_AR
