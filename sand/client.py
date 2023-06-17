from dataclasses import asdict
from functools import lru_cache
from pathlib import Path
from typing import Union

import requests
import serde.json
from gena.client import Client as IndividualClient
from peewee import fn
from sm.prelude import M
from tqdm import tqdm

from sand.models import Project, SemanticModel, Table, init_db
from sand.models.table import CandidateEntity, Link


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

    @lru_cache(maxsize=None)
    def get_project_id(self, name: str) -> int:
        """Get project id by name"""
        project = self.projects.get_one({"name": name, "fields": "id"})
        return project["id"]

    @lru_cache(maxsize=None)
    def get_table_id(self, project_name: str, table_name: str):
        project_id = self.get_project_id(project_name)
        table = self.tables.get_one(
            {"project": project_id, "name": table_name, "fields": "id"}
        )
        return table["id"]

    @lru_cache(maxsize=None)
    def get_table_size(self, table_id: int):
        """Return the number of rows in a table."""
        return self.tables.get_one({"id": table_id, "fields": "size"})["size"]

    def get_table_url(self, table_id: int):
        """Return a URL to browse a table."""
        return f"{self.url}/tables/{table_id}"

    def get_table_url_by_name(self, project_name: str, table_name: str):
        """Return a URL to browse a table by its name."""
        return self.get_table_url(self.get_table_id(project_name, table_name))

    def update_column_links(self, table_id: int, column: int, links: list[list[Link]]):
        """Update all links in a column of a table.

        Args:
            table_id: table id
            column: column index
            links: list of links of each cell. A cell may have more than one link or no links.
        """
        for ri, clinks in enumerate(links):
            rowid = self.table_rows.get_one(
                {"table": table_id, "index": ri, "fields": "id"}
            )["id"]
            resp = requests.put(
                f"{self.table_rows.endpoint}/{rowid}/cells/{column}",
                json={"links": [asdict(l) for l in clinks]},
            )
            self.table_rows.assert_resp(resp)
            assert resp.json()["success"]

    def get_column_links(self, table_id: int, column: int) -> list[list[Link]]:
        """Get annotated links of a column of a table.

        Args:
            table_id: table id
            column: column index
        """
        rows = self.table_rows.get(
            {"table": table_id, "fields": "index,links", "limit": 1000}
        )
        assert len(rows) == self.get_table_size(table_id)
        links = [[] for _ in range(len(rows))]
        for row in rows:
            lst = []
            for item in row["links"].get(str(column), []):
                lst.append(
                    Link(
                        start=item["start"],
                        end=item["end"],
                        url=item["url"],
                        entity_id=item["entity_id"],
                        candidate_entities=[
                            CandidateEntity(c["entity_id"], c["probability"])
                            for c in item["candidate_entities"]
                        ],
                    )
                )
            links[row["index"]] = lst
        return links

    def export(self, project_name: str, outdir: Union[str, Path]):
        """Export a project to a directory."""
        raise NotImplementedError()
        # outdir = Path(outdir)
        # project = Project.get(name=project_name)
        # tables = list(project.tables)

        # for tbl in tqdm(tables):
        #     dname = LinkedTable.get_friendly_fs_id(tbl.name)
        #     subquery = (
        #         SemanticModel.select(
        #             SemanticModel.id, fn.MAX(SemanticModel.version).alias("version")
        #         )
        #         .where(SemanticModel.table == tbl.id)
        #         .group_by(SemanticModel.table, SemanticModel.name)
        #         .alias("q1")
        #     )

        #     query = (
        #         SemanticModel.select()
        #         .where(SemanticModel.table == tbl.id)
        #         .join(subquery, on=(SemanticModel.id == subquery.c.id))
        #     )

        #     sms = list(query)
        #     outfile = outdir / dname / f"version.01.json"
        #     outfile.parent.mkdir(exist_ok=True, parents=True)
        #     serde.json.ser([sm.data.to_dict() for sm in sms], outfile, indent=2)

        # return None
