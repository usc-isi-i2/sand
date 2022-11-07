import os

import sm.outputs.semantic_model as O
from gena import generate_api, generate_app, generate_readonly_api_4dict
from hugedict.chained_mapping import ChainedMapping
from sm.misc.funcs import import_attr

from sand.config import SETTINGS
from sand.controllers.assistant import assistant_bp
from sand.controllers.project import project_bp
from sand.controllers.table import table_bp, table_row_bp
from sand.controllers.settings import setting_bp
from sand.deserializer import deserialize_graph
from sand.models import EntityAR, SemanticModel
from sand.models.ontology import OntClass, OntClassAR, OntProperty, OntPropertyAR
from sand.serializer import (
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
