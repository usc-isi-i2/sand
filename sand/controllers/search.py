import threading
from typing import Dict, List, Union
from flask.blueprints import Blueprint
from sm.misc.funcs import import_func
from sand.config import SETTINGS
from flask import request, jsonify

from sand.extension_interface.search import IEntitySearch, IOntologySearch

search_bp = Blueprint("search", "search")

GetSearchCache = threading.local()


def get_search(name) -> Union[IEntitySearch, IOntologySearch]:
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
    payload = wikidata_search.find_class_by_name(search_text)
    return jsonify(payload)


@search_bp.route(f"/{search_bp.name}/entities", methods=["GET"])
def search_entities():
    """API Route to search for entities with their names"""
    search_text = request.args.get('q')
    wikidata_search = get_search('entities')
    payload = wikidata_search.find_entity_by_name(search_text)
    return jsonify(payload)


@search_bp.route(f"/{search_bp.name}/props", methods=["GET"])
def search_props():
    """API Route to search for properties with their names"""
    search_text = request.args.get('q')
    wikidata_search = get_search('props')
    payload = wikidata_search.find_props_by_name(search_text)
    return jsonify(payload)