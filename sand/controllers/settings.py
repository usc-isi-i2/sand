from dataclasses import asdict

from flask import Blueprint
from flask.json import jsonify
from sand.controllers.base import BaseController


class SettingController(BaseController):
    def get_blueprint(self) -> Blueprint:
        bp = Blueprint("settings", "settings")
        bp.add_url_rule(f"/{bp.name}", methods=["GET"], view_func=self.get_settings)
        return bp

    def get_settings(self):
        return jsonify(
            {
                "entity": {
                    "nil": asdict(self.app_cfg.entity.nil),
                    "instanceof": self.app_cfg.entity.instanceof,
                },
                "semantic_model": {
                    "identifiers": self.app_cfg.semantic_model.identifiers,
                    "statements": self.app_cfg.semantic_model.statements,
                },
            }
        )
