import importlib
from dataclasses import dataclass, field
from typing import List, Set, Optional, Dict

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
    def readable_label(self):
        return self.label


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


PROP_AR = None
CLASS_AR = None


def OntPropertyAR() -> Dict[str, OntProperty]:
    global PROP_AR

    if PROP_AR is None:
        cfg = DAO_SETTINGS["ont_props"]
        func = import_func(cfg["constructor"])
        PROP_AR = func(**cfg["args"])

    return PROP_AR


def OntClassAR() -> Dict[str, OntProperty]:
    global CLASS_AR

    if CLASS_AR is None:
        cfg = DAO_SETTINGS["ont_classes"]
        func = import_func(cfg["constructor"])
        CLASS_AR = func(**cfg["args"])

    return CLASS_AR
