from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Mapping, Optional, Union

from hugedict.chained_mapping import ChainedMapping
from kgdata.models.multilingual import MultiLingualString, MultiLingualStringList
from kgdata.wikidata.models.wdvalue import (
    ValueGlobeCoordinate,
    ValueMonolingualText,
    ValueQuantity,
    ValueTime,
)
from sand.config import APP_CONFIG
from sm.misc.funcs import import_attr, import_func


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
    APP_CONFIG.entity.nil.id: Entity(
        id=APP_CONFIG.entity.nil.id,
        uri=APP_CONFIG.entity.nil.uri,
        label=MultiLingualString.en("NIL"),
        aliases=MultiLingualStringList(lang2values={"en": []}, lang="en"),
        description=MultiLingualString.en("the correct entity is absent in KG"),
        properties={},
    )
}


def EntityAR() -> Mapping[str, Entity]:
    global ENTITY_AR

    if ENTITY_AR is None:
        cfg = APP_CONFIG.entity
        func = import_func(cfg.constructor)
        ENTITY_AR = ChainedMapping(func(**cfg.args), import_attr(cfg.default))

    return ENTITY_AR
