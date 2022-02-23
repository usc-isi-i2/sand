import os

from flask_peewee_restful import generate_readonly_api_4dict, generate_api
from flask_peewee_restful import generate_app
from flask_peewee_restful.deserializer import deserialize_dict, generate_deserializer
from grams.inputs.context import Attribute
from hugedict.chained_mapping import ChainedMapping
from smc.deserializer import deserialize_graph
from smc.models import SemanticModel, EntityAR, Project, Table, TableRow
from smc.models.ontology import OntClass, OntClassAR, OntProperty, OntPropertyAR
from smc.serializer import (
    serialize_class,
    serialize_entity,
    batch_serialize_sms,
    serialize_property,
)
import sm.outputs as O
from smc.plugins.wikidata import DEFAULT_ONT_CLASSES, DEFAULT_ONT_PROPS
from smc.controllers.table import table_bp


app = generate_app(
    [
        table_bp,
        generate_api(Project),
        generate_api(TableRow),
        generate_api(
            SemanticModel,
            deserializers={"data": deserialize_graph},
            batch_serialize=batch_serialize_sms,
        ),
        generate_readonly_api_4dict(
            "entities",
            serialize=serialize_entity,
            id2ent=EntityAR(),
        ),
        generate_readonly_api_4dict(
            "classes",
            serialize=serialize_class,
            id2ent=ChainedMapping(OntClassAR(), DEFAULT_ONT_CLASSES),
            unique_field_funcs={"uri": OntClass.uri2id},
        ),
        generate_readonly_api_4dict(
            "properties",
            serialize=serialize_property,
            id2ent=ChainedMapping(
                OntPropertyAR(),
                DEFAULT_ONT_PROPS,
            ),
            unique_field_funcs={"uri": OntProperty.uri2id},
        ),
    ],
    os.path.dirname(__file__),
)
