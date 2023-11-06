import os
from itertools import chain

from flask import jsonify
from gena import generate_api, generate_app, generate_readonly_api_4dict
from sand.config import AppConfig
from sand.controllers.assistant import AssistantController
from sand.controllers.project import project_bp
from sand.controllers.search import SearchController
from sand.controllers.settings import SettingController
from sand.controllers.table import TableController, table_row_bp
from sand.controllers.transform import transform_bp
from sand.models import EntityAR, SemanticModel
from sand.models.entity import Entity
from sand.models.ontology import OntClass, OntClassAR, OntProperty, OntPropertyAR
from sand.serde import AppSerde
from sm.misc.funcs import import_func
from werkzeug.exceptions import HTTPException


class App:
    def __init__(self, cfg: AppConfig):
        self.cfg = cfg

        # knowledge graph namespace
        self.kgns = cfg.get_kgns()

        # KG databases
        self.entity_ar = EntityAR(cfg)
        self.ontclass_ar = OntClassAR(cfg)
        self.ontprop_ar = OntPropertyAR(cfg)

        # for serialization and deserialization
        self.serde = AppSerde(self)

        # mapping from uri to the default resources
        self.uri2resource = {}
        self.id2resource = {}
        for func in [cfg.entity.default, cfg.clazz.default, cfg.property.default]:
            for obj in import_func(func)(cfg).values():
                obj: Entity | OntClass | OntProperty
                assert obj.uri not in self.uri2resource
                self.uri2resource[obj.uri] = obj
                self.id2resource[obj.id] = obj

    def uri_to_id(self, uri: str):
        """Convert an URI to the corresponding ID"""
        if uri in self.uri2resource:
            return self.uri2resource[uri].id
        return self.kgns.uri_to_id(uri)

    def id_to_uri(self, id: str):
        """Convert an ID to the corresponding URI"""
        if id in self.id2resource:
            return self.id2resource[id].uri
        return self.kgns.id_to_uri(id)

    def get_flask_app(self):
        app = generate_app(
            [
                TableController(self).get_blueprint(),
                project_bp,
                AssistantController(self).get_blueprint(),
                table_row_bp,
                SettingController(self).get_blueprint(),
                SearchController(self).get_blueprint(),
                transform_bp,
                generate_api(
                    SemanticModel,
                    deserializers={"data": self.serde.deserialize_graph},
                    batch_serialize=self.serde.batch_serialize_sms,
                ),
                generate_readonly_api_4dict(
                    "entities",
                    serialize=self.serde.serialize_entity,
                    id2ent=self.entity_ar,
                ),
                generate_readonly_api_4dict(
                    "classes",
                    serialize=self.serde.serialize_class,
                    id2ent=self.ontclass_ar,
                    unique_field_funcs={"uri": self.uri_to_id},
                ),
                generate_readonly_api_4dict(
                    "properties",
                    serialize=self.serde.serialize_property,
                    id2ent=self.ontprop_ar,
                    unique_field_funcs={"uri": self.uri_to_id},
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
