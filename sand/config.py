from __future__ import annotations

import os
from dataclasses import dataclass
from functools import cached_property
from pathlib import Path
from typing import Literal, TypedDict

import serde.yaml
from sm.misc.funcs import import_attr
from sm.namespaces.namespace import KnowledgeGraphNamespace

_ROOT_DIR = Path(os.path.abspath(__file__)).parent.parent
PACKAGE_DIR = str(Path(os.path.abspath(__file__)).parent)
FROM_SITEPACKAGES = _ROOT_DIR.name == "site-packages"

CACHE_SIZE = 10240
# indicate that this string is a relative path.
RELPATH_CONST = "::RELPATH::"


@dataclass
class AppConfig:
    kgns: str
    entity: EntityConfig
    clazz: OntResourceConfig
    property: OntResourceConfig
    semantic_model: SemanticModelConfig
    assistant: FnConfig
    search: SearchConfig
    export: FnConfig

    @staticmethod
    def from_yaml(infile: Path | str) -> AppConfig:
        cwd = Path(infile).parent
        obj = serde.yaml.deser(infile)

        return AppConfig(
            kgns=obj["kgns"],
            entity=EntityConfig(
                constructor=obj["entity"]["constructor"],
                args=AppConfig._parse_args(obj["entity"]["args"], cwd),
                default=obj["entity"]["default"],
                instanceof=obj["entity"]["instanceof"],
                nil=IdAndUri(obj["entity"]["nil"]["id"], obj["entity"]["nil"]["uri"]),
                new_entity_template=obj["entity"]["new_entity_template"],
            ),
            clazz=OntResourceConfig(
                constructor=obj["class"]["constructor"],
                args=AppConfig._parse_args(obj["class"]["args"], cwd),
                default=obj["class"]["default"],
            ),
            property=OntResourceConfig(
                constructor=obj["property"]["constructor"],
                args=AppConfig._parse_args(obj["property"]["args"], cwd),
                default=obj["property"]["default"],
            ),
            semantic_model=SemanticModelConfig(
                identifiers=obj["semantic_model"]["identifiers"],
                statements=obj["semantic_model"]["statements"],
            ),
            search=SearchConfig(
                entity=obj["search"]["entity"],
                ontology=obj["search"]["ontology"],
            ),
            assistant=FnConfig(
                default=obj["assistant"].pop("default"),
                funcs=AppConfig._parse_args(obj["assistant"], cwd),
            ),
            export=FnConfig(default=obj["export"].pop("default"), funcs=obj["export"]),
        )

    @staticmethod
    def default() -> AppConfig:
        return AppConfig.from_yaml(os.path.join(PACKAGE_DIR, "config.default.yml"))

    def update(self, obj: AppConfig):
        for k, v in obj.__dict__.items():
            if k.startswith("_"):
                continue
            self.__dict__[k] = v

    @staticmethod
    def _parse_args(obj: dict, cwd: Path):
        out = {}
        for k, v in obj.items():
            if isinstance(v, str) and v.startswith(RELPATH_CONST):
                out[k] = str(cwd / v[len(RELPATH_CONST) :])
            elif isinstance(v, dict):
                out[k] = AppConfig._parse_args(v, cwd)
            else:
                out[k] = v
        return out


@dataclass
class SearchConfig:
    entity: str
    ontology: str


class FnConstructor(TypedDict):
    constructor: str
    args: dict


@dataclass
class FnConfig:
    default: str
    funcs: dict[str, str | FnConstructor]

    def get_func(self, name: Literal["default"] | str) -> str | FnConstructor:
        if name == "default":
            return self.funcs[self.default]
        return self.funcs[name]


@dataclass
class EntityConfig:
    constructor: str
    args: dict
    default: str
    instanceof: dict[str, str]
    nil: IdAndUri
    new_entity_template: str


@dataclass
class IdAndUri:
    id: str
    uri: str


@dataclass
class OntResourceConfig:
    constructor: str
    args: dict
    default: str


@dataclass
class SemanticModelConfig:
    identifiers: list[str]
    statements: list[str]

    @cached_property
    def identifiers_set(self) -> set[str]:
        return set(self.identifiers)
