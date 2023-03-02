from __future__ import annotations
from dataclasses import asdict, dataclass
from typing import Optional, NamedTuple, List, Dict, Tuple, Union
from gena.custom_fields import (
    ListDataClassField,
    DataClassField,
    Dict2ListDataClassField,
)
from rsoup.rsoup import ContentHierarchy

import orjson
from peewee import CharField, ForeignKeyField, CompositeKey, TextField, IntegerField
from playhouse.shortcuts import model_to_dict
from playhouse.sqlite_ext import JSONField

from sand.models.base import BaseModel
from sand.models.entity import Value
from sand.models.project import Project


@dataclass
class CandidateEntity:
    entity_id: str  # entity id, can't be NIL_ENTITY
    probability: float


@dataclass
class Link:
    start: int
    end: int
    # none when the entity is not mapped yet, if there is no entity, use NIL_ENTITY
    url: Optional[str]
    entity_id: Optional[str]  # entity id
    candidate_entities: List[CandidateEntity]

    @staticmethod
    def from_tuple(value):
        return Link(*value[:-1], [CandidateEntity(*x) for x in value[-1]])  # type: ignore


@dataclass
class ContextPage:
    url: str
    title: str
    entity: Optional[str]  # entity id associated with the page


class Table(BaseModel):
    name = CharField()
    description = TextField()
    # list of columns in the table
    columns: List[str] = JSONField()  # type: ignore
    project = ForeignKeyField(Project, backref="tables", on_delete="CASCADE")
    size = IntegerField()
    context_page: Optional[ContextPage] = DataClassField(ContextPage, null=True)  # type: ignore
    context_values: List[Value] = ListDataClassField(Value)  # type: ignore
    context_tree: List[ContentHierarchy] = ListDataClassField(ContentHierarchy)  # type: ignore

    class Meta:
        indexes = ((("project", "name"), True),)

    def to_dict(self):
        return {
            "id": self.id,  # type: ignore
            "name": self.name,
            "description": self.description,
            "columns": self.columns,
            "project": self.project_id,  # type: ignore
            "size": self.size,
            "context_page": asdict(self.context_page)
            if self.context_page is not None
            else None,
            "context_values": [asdict(x) for x in self.context_values]
            if self.context_values is not None
            else None,
            "context_tree": [x.to_dict() for x in self.context_tree]
            if self.context_tree is not None
            else None,
        }


class TableRow(BaseModel):
    # fmt: off
    table = ForeignKeyField(Table, backref="rows", on_delete="CASCADE")
    index = IntegerField()  # type: ignore
    row: List[Union[str, float]] = JSONField(json_dumps=orjson.dumps, json_loads=orjson.loads)  # type: ignore
    links: Dict[str, List[Link]] = Dict2ListDataClassField(Link)  # type: ignore
    # fmt: on

    class Meta:
        indexes = ((("table", "index"), True),)

    def to_dict(self):
        dlinks = {}
        if self.links is not None:
            for ci, links in self.links.items():
                newlinks = []
                for link in links:
                    link = asdict(link)
                    # link["candidate_entities"] = [
                    #     cent._asdict() for cent in link["candidate_entities"]
                    # ]
                    newlinks.append(link)
                dlinks[ci] = newlinks

        return {
            "id": self.id,  # type: ignore
            "table": self.table_id,  # type: ignore
            "index": self.index,
            "row": self.row,
            "links": dlinks,
        }
