from abc import ABC, abstractmethod


class IExport(ABC):
    """
    Export interface class to export relational data to
    different data formats
    """

    @abstractmethod
    def export_data_model(self):
        """Search Class using name"""
        pass

    @abstractmethod
    def export_data(self):
        """Search Class using name"""
        pass
