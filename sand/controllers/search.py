import threading

from dependency_injector.wiring import Provide, inject
from flask import jsonify, request
from flask.blueprints import Blueprint
from gena.serializer import get_dataclass_serializer
from werkzeug.exceptions import BadRequest

from sand.extension_interface.search import IEntitySearch, IOntologySearch, SearchResult

search_bp = Blueprint("search", "search")

GetSearchCache = threading.local()
serializer = get_dataclass_serializer(SearchResult)


@search_bp.route(f"/{search_bp.name}/classes", methods=["GET"])
@inject
def search_classes(ontology_search: IOntologySearch = Provide["ontology_search"]):
    """API Route to search for classes with their names"""
    if "q" not in request.args:
        raise BadRequest("Missing search text")
    query = request.args["q"]

    search_results = ontology_search.find_class_by_name(query)
    serialized_payload = [serializer(item) for item in search_results]
    return jsonify({"items": serialized_payload})


@search_bp.route(f"/{search_bp.name}/entities", methods=["GET"])
@inject
def search_entities(entity_search: IEntitySearch = Provide["entity_search"]):
    """API Route to search for entities with their names"""
    if "q" not in request.args:
        raise BadRequest("Missing search text")
    query = request.args["q"]

    search_results = entity_search.find_entity_by_name(query)
    serialized_payload = [serializer(item) for item in search_results]
    return jsonify({"items": serialized_payload})


@search_bp.route(
    f"/{search_bp.name}/props",
    methods=["GET"],
)
@inject
def search_props(ontology_search: IOntologySearch = Provide["ontology_search"]):
    """API Route to search for properties with their names"""
    if "q" not in request.args:
        raise BadRequest("Missing search text")
    query = request.args["q"]

    search_results = ontology_search.find_props_by_name(query)
    serialized_payload = [serializer(item) for item in search_results]
    return jsonify({"items": serialized_payload})
