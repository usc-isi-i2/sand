from __future__ import annotations
from typing import Literal, Union, List
from peewee import (
    CharField,
    ForeignKeyField,
    TextField,
    IntegerField,
    BooleanField,
)
from playhouse.sqlite_ext import JSONField

from sand.models.base import BaseModel
from sand.models.table import Table


class Transformation(BaseModel):
    name = CharField()
    table = ForeignKeyField(Table, backref="transformations", on_delete="CASCADE")
    mode = CharField()
    datapath: Union[List[str], str] = JSONField()  # type: ignore
    outputpath: List[str] = JSONField()  # type: ignore
    type = CharField()
    code = TextField()
    on_error: Literal[
        "set_to_blank", "store_error", "keep_original", "abort"
    ] = CharField()
    is_draft = BooleanField()
    order = IntegerField()
    insert_after = ForeignKeyField("self", null=True, on_delete="SET NULL")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "table": self.table_id,
            "type": self.type,
            "mode": self.mode,
            "datapath": self.datapath,
            "outputpath": self.outputpath,
            "code": self.on_error,
            "on_error": self.on_error,
            "is_draft": self.is_draft,
            "order": self.order,
            "insert_after": self.insert_after,
        }
