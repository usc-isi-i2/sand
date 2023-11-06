from dataclasses import dataclass, field
from itertools import chain
from typing import Dict, Iterator, List, Literal, Mapping, TypeVar

from rdflib import RDF, RDFS
from sand.config import APP_CONFIG
from sm.misc.funcs import import_attr, import_func


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
    "number",
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


PROP_AR = None
CLASS_AR = None

DEFAULT_ONT_PROPS = {
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
DEFAULT_ONT_CLASSES = {}


V = TypeVar("V")
kgns = APP_CONFIG.get_kgns()


class OntMapping(Mapping[str, V]):
    def __init__(self, main: Mapping[str, V], default: Mapping[str, V]):
        self.main = main
        self.default = default

    def __getitem__(self, key: str):
        if key in self.main:
            return self.main[key]
        return self.default[key]

    def __iter__(self) -> Iterator[str]:
        return chain(iter(self.main), iter(self.default))

    def __len__(self) -> int:
        return len(self.main) + len(self.default)

    def __contains__(self, key: str) -> bool:
        return key in self.main or key in self.default

    def get(self, key: str, default=None):
        if key in self.main:
            return self.main[key]
        return self.default.get(key, default)

    def get_by_uri(self, uri: str, default=None):
        return self.get(kgns.uri_to_id(uri), default)


def OntPropertyAR() -> OntMapping[OntProperty]:
    """Get a mapping from id (not url) to the ontology property"""
    global PROP_AR

    if PROP_AR is None:
        cfg = APP_CONFIG.property
        func = import_func(cfg.constructor)
        PROP_AR = OntMapping(func(*cfg.args), import_attr(cfg.default))

    return PROP_AR


def OntClassAR() -> OntMapping[OntClass]:
    """Get a mapping from id (not url) to the ontology class"""
    global CLASS_AR

    if CLASS_AR is None:
        cfg = APP_CONFIG.clazz
        func = import_func(cfg.constructor)
        CLASS_AR = OntMapping(func(**cfg.args), import_attr(cfg.default))

    return CLASS_AR
