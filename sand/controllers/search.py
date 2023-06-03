import threading
from typing import Dict, List
from flask.blueprints import Blueprint
from sm.misc.funcs import import_func
from sand.config import SETTINGS
from flask import request, jsonify

from sand.extension_interface.search import ISearch

search_bp = Blueprint("search", "search")

GetSearchCache = threading.local()


def get_search(name) -> ISearch:
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
    search_text = request.args.get('q')
    wikidata_search = get_search('default')
    payload = wikidata_search.find_class_by_name(search_text)
    return jsonify(payload)


@search_bp.route(f"/{search_bp.name}/entities", methods=["GET"])
def search_entities():
    search_text = request.args.get('q')
    wikidata_search = get_search('default')
    payload = wikidata_search.find_entity_by_name(search_text)
    return jsonify(payload)


@search_bp.route(f"/{search_bp.name}/props", methods=["GET"])
def search_props():
    search_text = request.args.get('q')
    wikidata_search = get_search('default')
    payload = wikidata_search.find_props_by_name(search_text)
    return jsonify(payload)
