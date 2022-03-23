import os

import sm.outputs as O
from flask_peewee_restful import generate_api, generate_app, generate_readonly_api_4dict
from hugedict.chained_mapping import ChainedMapping
from sm.misc.funcs import import_attr

from smc.config import SETTINGS
from smc.controllers.assistant import assistant_bp
from smc.controllers.project import project_bp
from smc.controllers.table import table_bp, table_row_bp
from smc.controllers.settings import setting_bp
from smc.deserializer import deserialize_graph
from smc.models import EntityAR, SemanticModel
from smc.models.ontology import OntClass, OntClassAR, OntProperty, OntPropertyAR
from smc.serializer import (
    batch_serialize_sms,
    serialize_class,
    serialize_entity,
    serialize_property,
)

app = generate_app(
    [
        table_bp,
        project_bp,
        assistant_bp,
        table_row_bp,
        setting_bp,
        generate_api(
            SemanticModel,
            deserializers={"data": deserialize_graph},
            batch_serialize=batch_serialize_sms,
        ),
        generate_readonly_api_4dict(
            "entities",
            serialize=serialize_entity,
            id2ent=ChainedMapping(
                EntityAR(), import_attr(SETTINGS["entity"]["default"])
            ),
        ),
        generate_readonly_api_4dict(
            "classes",
            serialize=serialize_class,
            id2ent=ChainedMapping(
                OntClassAR(), import_attr(SETTINGS["ont_classes"]["default"])
            ),
            unique_field_funcs={"uri": OntClass.uri2id},
        ),
        generate_readonly_api_4dict(
            "properties",
            serialize=serialize_property,
            id2ent=ChainedMapping(
                OntPropertyAR(),
                import_attr(SETTINGS["ont_props"]["default"]),
            ),
            unique_field_funcs={"uri": OntProperty.uri2id},
        ),
    ],
    os.path.dirname(__file__),
)

app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # maximum upload of 16 MB
