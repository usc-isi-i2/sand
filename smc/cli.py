import glob
import os
from pathlib import Path

import click

from sm.prelude import I, O, M
from smc.models.base import db
from smc.models.entity import Value, ValueType
from smc.models.project import Project
from smc.models.semantic_model import SemanticModel
from smc.models.table import Table, TableRow, Link, ContextPage


@click.command()
def init():
    """Init database"""
    db.create_tables([Project, Table, TableRow, SemanticModel])
    Project(name="default", description="The default project").save()


@click.command()
@click.option("-d", "--description", required=True, help="Description of the project")
@click.argument("name")
def create(description: str, name: str):
    """Create project if not exist"""
    Project(name=name, description=description).save()


@click.command()
@click.option("-p", "--project", default="default", help="Project name")
@click.option("-t", "--tables", required=True, help="Path to tables")
@click.option(
    "-d", "--descriptions", default="", help="Path to semantic models of tables"
)
def load(project: str, tables: str, descriptions: str):
    """Load data into the project"""
    project = Project.get(name=project)
    table_files = [Path(x) for x in glob.glob(tables)]
    if descriptions == "":
        sm_files = []
    else:
        sm_files = [Path(x) for x in glob.glob(descriptions)]

    id2file = {}
    for tbl_file in table_files:
        tbl_id = tbl_file.name.split(".", 1)[0]
        id2file[tbl_id] = {"table": str(tbl_file), "sm": None}

    for sm_file in sm_files:
        tbl_id = sm_file.name
        if tbl_id not in id2file:
            continue

        assert sm_file.is_dir()
        sm_file = M.get_latest_path(os.path.join(sm_file, "version.json"))
        assert sm_file is not None

        id2file[tbl_id]["sm"] = sm_file

    for id, file in id2file.items():
        if file["table"].endswith(".json"):
            from grams.inputs.linked_table import LinkedTable

            tbl = LinkedTable.from_dict(M.deserialize_json(file["table"]))

            if tbl.context.page_qnode is None:
                context_values = []
            else:
                context_values = [Value(ValueType.URI, tbl.context.page_qnode)]

            links = {}
            for ri, rlink in enumerate(tbl.links):
                for ci, clinks in enumerate(rlink):
                    if len(clinks) > 0:
                        if ri not in links:
                            links[ri] = {}
                        links[ri][ci] = []
                        for clink in clinks:
                            links[ri][ci].append(
                                Link(
                                    clink.start,
                                    clink.end,
                                    clink.url,
                                    clink.qnode_id,
                                    [],
                                )
                            )

            columns = [col.name for col in tbl.table.columns]
            mtbl = Table(
                name=tbl.id,
                description="",
                columns=columns,
                size=tbl.size(),
                context_values=context_values,
                context_tree=[],
                context_page=ContextPage(tbl.context.page_url, tbl.context.page_title) if tbl.context.page_url is not None else None,
                project=project,
            )
            mtbl.save()

            for ri in range(tbl.size()):
                row = [tbl.table[ri, ci] for ci in range(len(columns))]
                TableRow(table=mtbl, index=ri, row=row, links=links[ri]).save()
        else:
            assert False

        if file["sm"] is not None:
            sms = [O.SemanticModel.from_dict(o) for o in M.deserialize_json(file["sm"])]
        else:
            sms = []

        for i, sm in enumerate(sms):
            SemanticModel(
                project=project,
                table=mtbl,
                name=f"sm-{i}",
                description="",
                version=1,
                data=sm
            ).save()


@click.group()
def cli():
    pass


cli.add_command(init)
cli.add_command(create)
cli.add_command(load)


if __name__ == "__main__":
    cli()
