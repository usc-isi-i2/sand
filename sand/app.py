import os

import sm.outputs.semantic_model as O
from flask import jsonify
from gena import generate_api, generate_app, generate_readonly_api_4dict
from hugedict.chained_mapping import ChainedMapping
from sm.misc.funcs import import_attr

from sand.config import SETTINGS
from sand.controllers.assistant import assistant_bp
from sand.controllers.project import project_bp
from sand.controllers.table import table_bp, table_row_bp
from sand.controllers.search import search_bp
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
from werkzeug.exceptions import HTTPException
import json

app = generate_app(
    [
        table_bp,
        project_bp,
        assistant_bp,
        table_row_bp,
        setting_bp,
        search_bp,
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
            id2ent=OntClassAR(),
            unique_field_funcs={"uri": OntClass.uri2id},
        ),
        generate_readonly_api_4dict(
            "properties",
            serialize=serialize_property,
            id2ent=OntPropertyAR(),
            unique_field_funcs={"uri": OntProperty.uri2id},
        ),
    ],
    os.path.dirname(__file__),
)


@app.errorhandler(HTTPException)
def handle_exception(e):
    """Return JSON instead of HTML for HTTP errors."""
    return jsonify({
        "status": "error",
        "message": str(e),
    }), e.code


app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # maximum upload of 16 MB
