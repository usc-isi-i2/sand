from peewee import CharField, TextField

from smc.models.base import BaseModel


class Project(BaseModel):
    name = CharField(unique=True)
    description = TextField()
