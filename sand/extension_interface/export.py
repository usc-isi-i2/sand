from abc import ABC, abstractmethod
from typing import List, AnyStr

import sm.outputs.semantic_model as O
from sand.models.table import Table, TableRow
from sand.models.table import Table, TableRow
from drepr.models import DRepr


class IExport(ABC):
    """
    Export interface class to export relational data to
    different data formats
    """

    @abstractmethod
    def export_data_model(self, table: Table, sm: O.SemanticModel) -> DRepr:
        """Search Class using name"""
        pass

    @abstractmethod
    def export_data(self, table: Table, rows: List[TableRow], sm: O.SemanticModel,
                    output_format: AnyStr):
        """Search Class using name"""
        pass
