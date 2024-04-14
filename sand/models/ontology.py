from dataclasses import dataclass, field
from typing import Dict, List, Literal, Mapping

from dependency_injector.wiring import Provide, inject
from rdflib import RDF, RDFS
from sm.misc.funcs import import_func

from sand.config import AppConfig
from sand.helpers.mapping_utils import KGMapping
from sand.helpers.namespace import NamespaceService


@dataclass
class OntClass:
    id: str
    uri: str
    label: str
    aliases: List[str]
    description: str
    parents: List[str]
    ancestors: Dict[str, int] = field(default_factory=dict)

    @property
    def readable_label(self):
        return self.label


OntPropertyDataType = Literal[
    "monolingualtext",
    "url",
    "entity",
    "datetime",
    "integer-number",
    "decimal-number",
    "string",
    "globe-coordinate",
    "unknown",  # don't know the type yet
]


@dataclass
class OntProperty:
    id: str
    uri: str
    label: str
    datatype: OntPropertyDataType
    aliases: List[str]
    description: str
    parents: List[str]
    ancestors: Dict[str, int] = field(default_factory=dict)

    @property
    def readable_label(self):
        return self.label


def semweb_default_props():
    return {
        "rdfs:label": OntProperty(
            id="rdfs:label",
            uri=str(RDFS.label),
            label="rdfs:label",
            aliases=[],
            datatype="string",
            description="Provides a human-readable version of a resource's name.",
            parents=[],
        ),
        "rdf:type": OntProperty(
            id="rdf:type",
            uri=str(RDF.type),
            label="rdf:type",
            aliases=[],
            datatype="entity",
            description="Is used to state that a resource is an instance of a class",
            parents=[],
        ),
    }


@inject
def get_default_properties(cfg: AppConfig = Provide["appcfg"]):
    mapping = import_func(cfg.property.default)()
    return mapping


@inject
def get_default_classes(cfg: AppConfig = Provide["appcfg"]):
    mapping = import_func(cfg.clazz.default)()
    return mapping


class OntClassAR(KGMapping[OntClass]):
    @staticmethod
    @inject
    def init(
        appcfg: AppConfig = Provide["appcfg"],
        namespace: NamespaceService = Provide["namespace"],
        default_classes: Mapping[str, OntClass] = Provide["default_classes"],
    ):
        cfg = appcfg.clazz
        func = import_func(cfg.constructor)
        return OntClassAR(func(**cfg.args), default_classes, namespace.uri_to_id)


class OntPropertyAR(KGMapping[OntProperty]):
    @staticmethod
    @inject
    def init(
        appcfg: AppConfig = Provide["appcfg"],
        namespace: NamespaceService = Provide["namespace"],
        default_properties: Mapping[str, OntProperty] = Provide["default_properties"],
    ):
        func = import_func(appcfg.property.constructor)
        return OntPropertyAR(
            func(**appcfg.property.args), default_properties, namespace.uri_to_id
        )
