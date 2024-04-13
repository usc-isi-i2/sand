from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from sm.outputs.semantic_model import SemanticModel

from sand.models.table import Link, Table, TableRow


class IAssistant:
    def predict(
        self, table: Table, rows: list[TableRow]
    ) -> tuple[Optional[SemanticModel], Optional[list[TableRow]]]:
        """Predict semantic model and link entities"""
        raise NotImplementedError()

    def predict_entities(
        self, table: Table, rows: list[TableRow], row: int, col: int
    ) -> list[Link]:
        """Predict entities for a cell"""
        raise NotImplementedError()
