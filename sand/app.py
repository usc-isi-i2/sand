import os

from dependency_injector.wiring import Provide, inject
from flask import jsonify
from gena import generate_api, generate_app, generate_readonly_api_4dict
from sm.misc.funcs import identity_func
from werkzeug.exceptions import HTTPException

import sand.deserializer as sand_deser
import sand.serializer as sand_ser
from sand.controllers.assistant import assistant_bp
from sand.controllers.project import project_bp
from sand.controllers.search import search_bp
from sand.controllers.settings import setting_bp
from sand.controllers.table import table_bp, table_row_bp
from sand.controllers.transformation import transformation_bp
from sand.helpers.namespace import NamespaceService
from sand.models import EntityAR, SemanticModel
from sand.models.ontology import OntClassAR, OntPropertyAR


@inject
def get_flask_app(
    namespace: NamespaceService = Provide["namespace"],
    entities: EntityAR = Provide["entities"],
    classes: OntClassAR = Provide["classes"],
    properties: OntPropertyAR = Provide["properties"],
):
    app = generate_app(
        [
            table_bp,
            project_bp,
            assistant_bp,
            table_row_bp,
            setting_bp,
            search_bp,
            transformation_bp,
            generate_api(
                SemanticModel,
                deserializers={"data": sand_deser.deserialize_graph},
                batch_serialize=sand_ser.batch_serialize_sms,
            ),
            generate_readonly_api_4dict(
                "entities",
                serialize=sand_ser.serialize_entity,
                id2ent=entities,
            ),
            generate_readonly_api_4dict(
                "classes",
                serialize=sand_ser.serialize_class,
                id2ent=classes,
                unique_field_funcs={"uri": namespace.uri_to_id},
            ),
            generate_readonly_api_4dict(
                "properties",
                serialize=sand_ser.serialize_property,
                id2ent=properties,
                unique_field_funcs={"uri": namespace.uri_to_id},
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
    return app
