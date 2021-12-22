from flask_peewee_restful.client import Client as IndividualClient


class Client:
    def __init__(self, url: str = "http://localhost") -> None:
        self.url = url
        self.projects = IndividualClient(f"{url}/api/project")
        self.tables = IndividualClient(f"{url}/api/table")
        self.table_rows = IndividualClient(f"{url}/api/tablerow")
        self.semantic_models = IndividualClient(f"{url}/api/semanticmodel")
