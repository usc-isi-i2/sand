from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from sm.outputs.semantic_model import SemanticModel
from sand.models.table import Table, TableRow


class IAssistant(ABC):
    @abstractmethod
    def predict(
            self, table: Table, rows: List[TableRow]
    ) -> Tuple[Optional[SemanticModel], Optional[List[TableRow]]]:
        """Predict semantic model and link entities"""
        pass
