import importlib
from dataclasses import dataclass, field
from typing import List, Mapping, Set, Optional, Dict

from smc.config import DAO_SETTINGS
from sm.misc.funcs import import_func


@dataclass
class OntClass:
    uri: str
    label: str
    aliases: List[str]
    description: str
    parents: List[str]
    parents_closure: Set[str] = field(default_factory=set)

    @property
    def id(self):
        return self.uri

    @property
    def readable_label(self):
        return self.label

    @staticmethod
    def uri2id(uri: str) -> str:
        """Convert class URI to entity ID."""
        raise NotImplementedError(
            "The method is set when its store is initialized. Check the call order to ensure `OntClassAR` is called first"
        )


@dataclass
class OntProperty:
    uri: str
    label: str
    aliases: List[str]
    description: str
    parents: List[str]
    parents_closure: Set[str] = field(default_factory=set)

    @property
    def id(self):
        return self.uri

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


def OntPropertyAR() -> Mapping[str, OntProperty]:
    global PROP_AR

    if PROP_AR is None:
        cfg = DAO_SETTINGS["ont_props"]
        func = import_func(cfg["constructor"])
        PROP_AR = func(**cfg["args"])
        OntProperty.uri2id = import_func(cfg["uri2id"])

    return PROP_AR


def OntClassAR() -> Mapping[str, OntClass]:
    global CLASS_AR

    if CLASS_AR is None:
        cfg = DAO_SETTINGS["ont_classes"]
        func = import_func(cfg["constructor"])
        CLASS_AR = func(**cfg["args"])
        OntClass.uri2id = import_func(cfg["uri2id"])

    return CLASS_AR
