import orjson
import sm.outputs.semantic_model as O
from peewee import CharField, ForeignKeyField, TextField, IntegerField
from playhouse.shortcuts import model_to_dict
from sand.models.base import BaseModel, BlobField
from sand.models.project import Project
from sand.models.table import Table


def ser_sm(pyvalue: O.SemanticModel):
    return orjson.dumps(pyvalue.to_dict())


def deser_sm(dbvalue: bytes):
    return O.SemanticModel.from_dict(orjson.loads(dbvalue))


class SemanticModel(BaseModel):
    table = ForeignKeyField(Table, backref="semantic_models", on_delete="CASCADE")
    # name of the semantic model as we may have more than one version for the same table
    name = CharField()
    description = TextField()  # description of this model
    version = IntegerField()  # version of the semantic model
    # the semantic model at this version
    data: O.SemanticModel = BlobField(serialize=ser_sm, deserialize=deser_sm)  # type: ignore

    class Meta:
        indexes = ((("table", "name"), True),)
