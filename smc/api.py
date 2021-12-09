import os

from flask_peewee_restful import generate_api_4dict, generate_api
from flask_peewee_restful import generate_app
from smc.models import SemanticModel, EntityAR, Project, Table, TableRow
from smc.serializer import serialize_entity, batch_serialize_sms


app = generate_app(
    [
        generate_api(Project),
        generate_api(Table),
        generate_api(TableRow),
        generate_api(SemanticModel, batch_serialize=batch_serialize_sms),
        generate_api_4dict("entities", id2ent=EntityAR(), serialize=serialize_entity),
    ],
    os.path.dirname(__file__),
)
