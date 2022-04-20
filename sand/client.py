from typing import Union
from gena.client import Client as IndividualClient
from grams.inputs.linked_table import LinkedTable
from pathlib import Path
from peewee import fn
from sand.models import init_db, SemanticModel, Project, Table
from sm.prelude import M
from tqdm import tqdm


class Client:
    def __init__(
        self,
        url: str = "http://localhost",
    ) -> None:
        self.url = url
        self.projects = IndividualClient(f"{url}/api/project")
        self.tables = IndividualClient(f"{url}/api/table")
        self.table_rows = IndividualClient(f"{url}/api/tablerow")
        self.semantic_models = IndividualClient(f"{url}/api/semanticmodel")

    def export(self, project_name: str, outdir: Union[str, Path]):
        outdir = Path(outdir)
        project = Project.get(name=project_name)
        tables = list(project.tables)

        for tbl in tqdm(tables):
            dname = LinkedTable._get_friendly_fs_id(tbl.name)
            subquery = (
                SemanticModel.select(
                    SemanticModel.id, fn.MAX(SemanticModel.version).alias("version")
                )
                .where(SemanticModel.table == tbl.id)
                .group_by(SemanticModel.table, SemanticModel.name)
                .alias("q1")
            )

            query = (
                SemanticModel.select()
                .where(SemanticModel.table == tbl.id)
                .join(subquery, on=(SemanticModel.id == subquery.c.id))
            )

            sms = list(query)
            outfile = outdir / dname / f"version.01.json"
            outfile.parent.mkdir(exist_ok=True, parents=True)
            M.serialize_json([sm.data.to_dict() for sm in sms], outfile, indent=2)

        return None
