from flask import Blueprint
from flask.json import jsonify
from sand.config import SETTINGS

setting_bp = Blueprint("settings", "settings")


@setting_bp.route(f"/{setting_bp.name}", methods=["GET"])
def get_settings():
    return jsonify(
        {
            "entity": {
                "nil": SETTINGS["entity"]["nil"],
                "instanceof": SETTINGS["entity"]["instanceof"],
            },
            "semantic_model": {
                "identifiers": SETTINGS["semantic_model"]["identifiers"],
                "statements": SETTINGS["semantic_model"]["statements"],
            },
        }
    )
