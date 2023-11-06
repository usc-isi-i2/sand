from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from flask import Blueprint

if TYPE_CHECKING:
    from sand.app import App


class BaseController(ABC):
    def __init__(self, app: App):
        self.app = app
        self.app_cfg = app.cfg

        self.entity_ar = app.entity_ar
        self.ontclass_ar = app.ontclass_ar
        self.ontprop_ar = app.ontprop_ar

    @abstractmethod
    def get_blueprint(self) -> Blueprint:
        ...
