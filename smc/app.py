import os

from flask_peewee_restful import generate_readonly_api_4dict, generate_api
from flask_peewee_restful import generate_app
from flask_peewee_restful.deserializer import deserialize_dict, generate_deserializer
from grams.inputs.context import Attribute
from smc.models import SemanticModel, EntityAR, Project, Table, TableRow
from smc.models.ontology import OntPropertyAR
from smc.serializer import serialize_entity, batch_serialize_sms, serialize_property
import sm.outputs as O


app = generate_app(
    [
        generate_api(
            Table,
            deserializers=generate_deserializer(Table, {Attribute: deserialize_dict}),
        ),
        generate_api(Project),
        generate_api(TableRow),
        generate_api(
            SemanticModel,
            deserializers={
                "data": lambda value: O.SemanticModel.from_dict(deserialize_dict(value))
            },
            batch_serialize=batch_serialize_sms,
        ),
        generate_readonly_api_4dict(
            "entities", id2ent=EntityAR(), serialize=serialize_entity
        ),
        generate_readonly_api_4dict(
            "properties", id2ent=OntPropertyAR(), serialize=serialize_property
        ),
    ],
    os.path.dirname(__file__),
)
