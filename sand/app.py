import os

from flask import jsonify
from gena import generate_api, generate_app, generate_readonly_api_4dict
from sand.config import APP_CONFIG
from sand.controllers.assistant import assistant_bp
from sand.controllers.project import project_bp
from sand.controllers.search import search_bp
from sand.controllers.settings import setting_bp
from sand.controllers.table import table_bp, table_row_bp
from sand.controllers.transform import transform_bp
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

uri_to_id = APP_CONFIG.get_kgns().uri_to_id

app = generate_app(
    [
        table_bp,
        project_bp,
        assistant_bp,
        table_row_bp,
        setting_bp,
        search_bp,
        transform_bp,
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
            unique_field_funcs={"uri": uri_to_id},
        ),
        generate_readonly_api_4dict(
            "properties",
            serialize=serialize_property,
            id2ent=OntPropertyAR(),
            unique_field_funcs={"uri": uri_to_id},
        ),
    ],
    os.path.dirname(__file__),
)


@app.errorhandler(HTTPException)
def handle_exception(e):
    """Return JSON instead of HTML for HTTP errors."""
    return (
        jsonify(
            {
                "status": "error",
                "message": str(e),
            }
        ),
        e.code,
    )


app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # maximum upload of 16 MB
