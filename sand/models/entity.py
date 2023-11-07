from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal, Mapping, Union

from dependency_injector.wiring import Provide, inject
from kgdata.models.multilingual import MultiLingualString, MultiLingualStringList
from kgdata.wikidata.models.wdvalue import (
    ValueGlobeCoordinate,
    ValueMonolingualText,
    ValueQuantity,
    ValueTime,
)
from sm.misc.funcs import import_func

from sand.config import AppConfig
from sand.helpers.mapping_utils import KGMapping

if TYPE_CHECKING:
    from sand.helpers.namespace import NamespaceService


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


@inject
def get_default_entities(appcfg: AppConfig = Provide["appcfg"]):
    mapping = {
        appcfg.entity.nil.id: Entity(
            id=appcfg.entity.nil.id,
            uri=appcfg.entity.nil.uri,
            label=MultiLingualString.en("NIL"),
            aliases=MultiLingualStringList(lang2values={"en": []}, lang="en"),
            description=MultiLingualString.en("the correct entity is absent in KG"),
            properties={},
        )
    }
    mapping.update(import_func(appcfg.entity.default)())
    return mapping


class EntityAR(KGMapping[Entity]):
    @staticmethod
    @inject
    def init(
        appcfg: AppConfig = Provide["appcfg"],
        namespace: NamespaceService = Provide["namespace"],
        default_entities: Mapping[str, Entity] = Provide["default_entities"],
    ):
        return EntityAR(
            import_func(appcfg.entity.constructor)(**appcfg.entity.args),
            default_entities,
            namespace.uri_to_id,
        )
