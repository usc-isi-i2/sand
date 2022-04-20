from peewee import CharField, TextField

from sand.models.base import BaseModel


class Project(BaseModel):
    name = CharField(unique=True)
    description = TextField()
