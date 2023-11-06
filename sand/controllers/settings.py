from dataclasses import asdict

from flask import Blueprint
from flask.json import jsonify
from sand.config import APP_CONFIG

setting_bp = Blueprint("settings", "settings")


@setting_bp.route(f"/{setting_bp.name}", methods=["GET"])
def get_settings():
    return jsonify(
        {
            "entity": {
                "nil": asdict(APP_CONFIG.entity.nil),
                "instanceof": APP_CONFIG.entity.instanceof,
            },
            "semantic_model": {
                "identifiers": APP_CONFIG.semantic_model.identifiers,
                "statements": APP_CONFIG.semantic_model.statements,
            },
        }
    )
