from __future__ import annotations

from dependency_injector.wiring import Provide, inject

from sand.config import AppConfig
from sand.extension_interface.assistant import IAssistant
from sand.helpers.namespace import NamespaceService
from sand.models.table import Link, Table, TableRow


class GRAMSAssistant(IAssistant):

    @inject
    def __init__(
        self,
        appcfg: AppConfig = Provide["appcfg"],
        namespace: NamespaceService = Provide["namespace"],
    ):
        self.appcfg = appcfg
        self.namespace = namespace

    # def predict_entities(
    #     self, table: Table, rows: list[TableRow], row: int, col: int
    # ) -> list[Link]:
    #     text = str(rows[row].row[col])
