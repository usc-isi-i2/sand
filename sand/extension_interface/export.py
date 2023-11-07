from __future__ import annotations

from abc import ABC, abstractmethod

import sm.outputs.semantic_model as O
from drepr.engine import OutputFormat

from sand.models.table import Table, TableRow


class IExport(ABC):
    """
    Export interface class to export data to different data formats
    """

    @abstractmethod
    def export_data_model(self, table: Table, sm: O.SemanticModel) -> dict[str, str]:
        """Export data model in multiple formats"""
        pass

    @abstractmethod
    def export_extra_resources(
        self, table: Table, rows: list[TableRow], sm: O.SemanticModel
    ) -> dict[str, str]:
        """Export extra resources generated automatically by the system"""
        pass

    @abstractmethod
    def export_data(
        self,
        table: Table,
        rows: list[TableRow],
        sm: O.SemanticModel,
        output_format: OutputFormat,
    ):
        """Export relational data"""
        pass
