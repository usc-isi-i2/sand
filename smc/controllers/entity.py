from flask import Blueprint, request, jsonify
from werkzeug.exceptions import BadRequest

from smc.models.entity import Entity, EntityAR

bp = Blueprint("entities", __name__)


@bp.route("/entities", methods=["GET"])
def controller__entity__query():
    ar = EntityAR()
    if "uris" not in request.json:
        raise BadRequest("Bad request. Missing `uris`")

    entities = []
    for uri in request.json["uris"]:
        ent = ar.get(uri)
        if ent is not None:
            entities.append(serialize_entity(ent))

    return jsonify(entities)


def serialize_entity(ent: Entity):
    return {
        "uri": ent.uri,
        "label": ent.readable_label,
        "description": ent.description,
        "types": [],
    }
