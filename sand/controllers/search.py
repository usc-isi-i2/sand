import threading
from functools import lru_cache
from typing import Literal, Union

from flask import jsonify, request
from flask.blueprints import Blueprint
from gena.serializer import get_dataclass_serializer
from sand.controllers.base import BaseController
from sand.extension_interface.search import IEntitySearch, IOntologySearch, SearchResult
from sm.misc.funcs import import_func
from werkzeug.exceptions import BadRequest

search_bp = Blueprint("search", "search")

GetSearchCache = threading.local()
serializer = get_dataclass_serializer(SearchResult)


class SearchController(BaseController):
    def get_blueprint(self) -> Blueprint:
        bp = Blueprint("search", "search")
        bp.add_url_rule(
            f"/{bp.name}/classes", methods=["GET"], view_func=self.search_classes
        )
        bp.add_url_rule(
            f"/{bp.name}/entities", methods=["GET"], view_func=self.search_entities
        )
        bp.add_url_rule(
            f"/{bp.name}/props", methods=["GET"], view_func=self.search_props
        )
        return bp

    def search_classes(self):
        """API Route to search for classes with their names"""
        if "q" not in request.args:
            raise BadRequest("Missing search text")
        query = request.args["q"]

        wikidata_search = self.get_ont_search()
        search_results = wikidata_search.find_class_by_name(query)
        serialized_payload = [serializer(item) for item in search_results]
        return jsonify({"items": serialized_payload})

    def search_entities(self):
        """API Route to search for entities with their names"""
        if "q" not in request.args:
            raise BadRequest("Missing search text")
        query = request.args["q"]

        wikidata_search = self.get_entity_search()
        search_results = wikidata_search.find_entity_by_name(query)
        serialized_payload = [serializer(item) for item in search_results]
        return jsonify({"items": serialized_payload})

    def search_props(self):
        """API Route to search for properties with their names"""
        if "q" not in request.args:
            raise BadRequest("Missing search text")
        query = request.args["q"]

        wikidata_search = self.get_ont_search()
        search_results = wikidata_search.find_props_by_name(query)
        serialized_payload = [serializer(item) for item in search_results]
        return jsonify({"items": serialized_payload})

    @lru_cache()
    def get_entity_search(self) -> IEntitySearch:
        return import_func(self.app_cfg.search.entity)(self.app)

    @lru_cache()
    def get_ont_search(self) -> IOntologySearch:
        return import_func(self.app_cfg.search.ontology)(self.app)
