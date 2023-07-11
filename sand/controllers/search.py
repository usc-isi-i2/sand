import threading
from typing import Dict, List, Union, Literal
from flask.blueprints import Blueprint
from sm.misc.funcs import import_func
from sand.config import SETTINGS
from flask import request, jsonify

from sand.extension_interface.search import IEntitySearch, IOntologySearch
from sand.models.search import SearchResult
from gena.serializer import get_dataclass_serializer

search_bp = Blueprint("search", "search")

GetSearchCache = threading.local()
serializer = get_dataclass_serializer(SearchResult)


def get_search(name: Literal['classes', 'entities', 'props']) -> Union[IEntitySearch, IOntologySearch]:
    """
    Returns an implementation of an ISearch Interface from the
    configuration file.
    """
    global GetSearchCache

    if not hasattr(GetSearchCache, "search"):
        GetSearchCache.search = {}
        search_config = SETTINGS["search"]
        constructor = search_config[name]
        GetSearchCache.search[name] = import_func(constructor)()

    return GetSearchCache.search[name]


@search_bp.route(f"/{search_bp.name}/classes", methods=["GET"])
def search_classes():
    """API Route to search for classes with their names"""
    search_text = request.args.get('q')
    wikidata_search = get_search('classes')
    search_results = wikidata_search.find_class_by_name(search_text)
    serialized_payload = [serializer(item) for item in search_results]
    return jsonify({'items': serialized_payload})


@search_bp.route(f"/{search_bp.name}/entities", methods=["GET"])
def search_entities():
    """API Route to search for entities with their names"""
    search_text = request.args.get('q')
    wikidata_search = get_search('entities')
    search_results = wikidata_search.find_entity_by_name(search_text)
    serialized_payload = [serializer(item) for item in search_results]
    return jsonify({'items': serialized_payload})


@search_bp.route(f"/{search_bp.name}/props", methods=["GET"])
def search_props():
    """API Route to search for properties with their names"""
    search_text = request.args.get('q')
    wikidata_search = get_search('props')
    search_results = wikidata_search.find_props_by_name(search_text)
    serialized_payload = [serializer(item) for item in search_results]
    return jsonify({'items': serialized_payload})
