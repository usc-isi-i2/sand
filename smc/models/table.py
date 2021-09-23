from typing import Optional, NamedTuple, List, Dict, Tuple

import orjson
from peewee import CharField, ForeignKeyField, CompositeKey, TextField, IntegerField
from playhouse.shortcuts import model_to_dict
from playhouse.sqlite_ext import JSONField

from smc.models.base import BaseModel, BlobField
from smc.models.entity import Value
from smc.models.project import Project


class CandidateEntity(NamedTuple):
    uri: str
    probability: float


class Link(NamedTuple):
    start: int
    end: int
    url: str
    entity: Optional[str]  # uri of entity
    candidate_entities: List[CandidateEntity]

    @staticmethod
    def from_tuple(v: tuple):
        return Link(*v[:-1], [CandidateEntity(*x) for x in v[-1]])


class ContextPage(NamedTuple):
    url: str
    title: str


class ContextLevel(NamedTuple):
    level: int
    header: str
    content: str

    def clone(self):
        return ContextLevel(self.level, self.header, self.content)


def deser_tbl_context_values(value):
    return [Value(**v) for v in orjson.loads(value)]


def deser_tbl_context_tree(value):
    return [ContextLevel(*v) for v in orjson.loads(value)]


def deser_tbl_context_page(value):
    return ContextPage(*value) if value != b"null" else None


def deser_tbl_links(value):
    return {ci: [Link.from_tuple(v) for v in lst] for ci, lst in orjson.loads(value)}


def ser_tbl_links(pyvalue):
    return orjson.dumps(
        list(pyvalue.items()),
        default=list,
    )


class Table(BaseModel):
    name = CharField()
    description = TextField()
    columns: List[str] = JSONField()  # list of columns in the table
    project = ForeignKeyField(Project, backref="tables")
    size = IntegerField()
    context_page: Optional[ContextPage] = BlobField(
        serialize=lambda x: orjson.dumps(x, default=list),
        deserialize=deser_tbl_context_page,
        null=True,
    )
    context_values: List[Value] = BlobField(
        serialize=orjson.dumps, deserialize=deser_tbl_context_values
    )
    context_tree: List[ContextLevel] = BlobField(
        serialize=lambda x: orjson.dumps(x, default=list),
        deserialize=deser_tbl_context_tree,
    )

    class Meta:
        indexes = ((("project", "name"), True),)


class TableRow(BaseModel):
    table = ForeignKeyField(Table, backref="rows")
    index = IntegerField()
    row = JSONField(json_dumps=orjson.dumps, json_loads=orjson.loads)
    links: Dict[int, List[Link]] = BlobField(
        serialize=ser_tbl_links, deserialize=deser_tbl_links
    )

    def to_dict(self):
        dlinks = {}
        for ci, links in self.links.items():
            newlinks = []
            for link in links:
                link = link._asdict()
                link['candidate_entities'] = [
                    cent._asdict() for cent in link['candidate_entities']
                ]
                newlinks.append(link)
            dlinks[ci] = newlinks

        return {
            "id": self.id,
            "table": self.table_id,
            "index": self.index,
            "row": self.row,
            "links": dlinks,
        }
