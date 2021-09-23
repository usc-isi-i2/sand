import orjson
import sm.outputs as O
from peewee import CharField, ForeignKeyField, TextField, IntegerField
from playhouse.shortcuts import model_to_dict
from smc.models.base import BaseModel, BlobField
from smc.models.project import Project
from smc.models.table import Table


def ser_sm(pyvalue: O.SemanticModel):
    return orjson.dumps(pyvalue.to_dict())


def deser_sm(dbvalue: bytes):
    return O.SemanticModel.from_dict(orjson.loads(dbvalue))


class SemanticModel(BaseModel):
    project = ForeignKeyField(Project, backref="tables")
    table = ForeignKeyField(Table, backref="semantic_models")
    name = (
        CharField()
    )  # name of the semantic model as we may have more than one version for the same table
    description = TextField()  # description of this model
    version = IntegerField()  # version of the semantic model
    data: O.SemanticModel = BlobField(
        serialize=ser_sm, deserialize=deser_sm
    )  # the semantic model at this version

    class Meta:
        indexes = ((("table", "name"), True),)
