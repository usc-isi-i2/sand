from dataclasses import dataclass, field
from typing import Dict, List, Literal, Mapping, Set

from rdflib import RDFS
from sm.misc.funcs import import_func
from sand.config import SETTINGS


@dataclass
class OntClass:
    id: str
    uri: str
    label: str
    aliases: List[str]
    description: str
    parents: List[str]
    ancestors: Set[str] = field(default_factory=set)

    @property
    def readable_label(self):
        return self.label

    @staticmethod
    def uri2id(uri: str) -> str:
        """Convert class URI to entity ID."""
        raise NotImplementedError(
            "The method is set when its store is initialized. Check the call order to ensure `OntClassAR` is called first"
        )


OntPropertyDataType = Literal[
    "monolingualtext",
    "url",
    "entity",
    "datetime",
    "number",
    "string",
    "globe-coordinate",
    "unknown"  # don't know the type yet
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
    ancestors: Set[str] = field(default_factory=set)

    @property
    def readable_label(self):
        return self.label

    @staticmethod
    def uri2id(uri: str) -> str:
        """Convert property URI to entity ID."""
        raise NotImplementedError(
            "The method is set when its store is initialized. Check the call order to ensure `OntPropertyAR` is called first"
        )


PROP_AR = None
CLASS_AR = None

DEFAULT_ONT_PROPS = {
    "rdfs:label": OntProperty(
        id="rdfs:label",
        uri=str(RDFS.label),
        label="rdfs:label",
        aliases=[],
        datatype="string",
        description="",
        parents=[],
    )
}
DEFAULT_ONT_CLASSES = {}


def OntPropertyAR() -> Mapping[str, OntProperty]:
    """Get a mapping from id (not url) to the ontology property"""
    global PROP_AR

    if PROP_AR is None:
        cfg = SETTINGS["ont_props"]
        func = import_func(cfg["constructor"])
        PROP_AR = func(**cfg["args"])
        OntProperty.uri2id = import_func(cfg["uri2id"])

    return PROP_AR


def OntClassAR() -> Mapping[str, OntClass]:
    """Get a mapping from id (not url) to the ontology class"""
    global CLASS_AR

    if CLASS_AR is None:
        cfg = SETTINGS["ont_classes"]
        func = import_func(cfg["constructor"])
        CLASS_AR = func(**cfg["args"])
        OntClass.uri2id = import_func(cfg["uri2id"])

    return CLASS_AR
