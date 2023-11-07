from dataclasses import asdict

from dependency_injector.wiring import Provide, inject
from flask import Blueprint
from flask.json import jsonify

from sand.config import AppConfig

setting_bp = Blueprint("settings", "settings")


@setting_bp.route(f"/{setting_bp.name}", methods=["GET"])
@inject
def get_settings(appcfg: AppConfig = Provide["appcfg"]):
    return jsonify(
        {
            "entity": {
                "nil": asdict(appcfg.entity.nil),
                "instanceof": appcfg.entity.instanceof,
            },
            "semantic_model": {
                "identifiers": appcfg.semantic_model.identifiers,
                "statements": appcfg.semantic_model.statements,
            },
        }
    )
