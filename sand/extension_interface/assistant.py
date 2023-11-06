from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, List, Optional, Tuple

from sand.models.table import Table, TableRow
from sm.outputs.semantic_model import SemanticModel

if TYPE_CHECKING:
    from sand.app import App


class IAssistant(ABC):
    def __init__(self, app: App):
        self.app = app

    @abstractmethod
    def predict(
        self, table: Table, rows: List[TableRow]
    ) -> Tuple[Optional[SemanticModel], Optional[List[TableRow]]]:
        """Predict semantic model and link entities"""
        pass
