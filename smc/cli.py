import glob
import os
from pathlib import Path

import click
from loguru import logger
from tqdm.auto import tqdm

from sm.prelude import I, O, M
from tornado.wsgi import WSGIContainer
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop


@click.command()
def init():
    """Init database"""
    from smc.models import db, Project, Table, TableRow, SemanticModel

    db.create_tables([Project, Table, TableRow, SemanticModel])
    Project(name="default", description="The default project").save()


@click.command()
@click.option("-d", "--dbfile", default="", help="smc database file")
@click.option(
    "--externaldb",
    default="",
    help="Folder contains external databases containing entities & ontologies",
)
@click.option(
    "--externaldb-proxy",
    is_flag=True,
    help="Enable proxy on the externaldb",
)
@click.option("--wsgi", is_flag=True, help="Whether to use wsgi server")
@click.option("-p", "--port", default=5524, help="Listening port")
@click.option(
    "--certfile", default=None, help="Path to the certificate signing request"
)
@click.option("--keyfile", default=None, help="Path to the key file")
def start(
    dbfile: str,
    externaldb: str,
    externaldb_proxy: bool,
    wsgi: bool,
    port: int,
    certfile: str,
    keyfile: str,
):
    if dbfile.strip() != "" and "DBFILE" not in os.environ:
        os.environ["DBFILE"] = dbfile.strip()

    if externaldb.strip() != "":
        from smc.config import DAO_SETTINGS

        for cfg in DAO_SETTINGS.values():
            cfg["args"]["dbfile"] = os.path.join(
                externaldb, Path(cfg["args"]["dbfile"]).name
            )
            cfg["args"]["proxy"] = externaldb_proxy

    from smc.api import app

    if certfile is None or keyfile is None:
        ssl_options = None
    else:
        ssl_options = {"certfile": certfile, "keyfile": keyfile}
        assert not wsgi

    if wsgi:
        app.run(host="0.0.0.0", port=port)
    else:
        logger.info("Start server in non-wsgi mode")
        http_server = HTTPServer(WSGIContainer(app), ssl_options=ssl_options)
        http_server.listen(port)
        IOLoop.instance().start()


@click.command()
@click.option("-d", "--description", required=True, help="Description of the project")
@click.argument("name")
def create(description: str, name: str):
    """Create project if not exist"""
    from smc.models import Project

    Project(name=name, description=description).save()


@click.command()
@click.option("-p", "--project", default="default", help="Project name")
@click.option("-t", "--tables", required=True, help="Path to tables")
@click.option(
    "-d", "--descriptions", default="", help="Path to semantic models of tables"
)
def load(project: str, tables: str, descriptions: str):
    """Load data into the project"""
    from smc.models import (
        db,
        Project,
        Value,
        Link,
        Table,
        ContextPage,
        TableRow,
        SemanticModel,
    )
    from smc.plugins.grams import convert_linked_table

    with db:
        project = Project.get(name=project)
        table_files = [Path(x) for x in sorted(glob.glob(tables))]
        if descriptions == "":
            sm_files = []
        else:
            sm_files = [Path(x) for x in glob.glob(descriptions)]

        id2file = {}
        for tbl_file in table_files:
            tbl_id = tbl_file.name.split(".", 1)[0]
            id2file[tbl_id] = {"table": str(tbl_file), "sm": None}

        for sm_file in tqdm(sm_files):
            tbl_id = sm_file.name
            if tbl_id not in id2file:
                continue

            assert sm_file.is_dir()
            sm_file = M.get_latest_path(os.path.join(sm_file, "version.json"))
            assert sm_file is not None

            id2file[tbl_id]["sm"] = sm_file

        for id, file in tqdm(id2file.items()):
            if file["table"].endswith(".json"):
                from grams.inputs.linked_table import LinkedTable

                tbl = LinkedTable.from_dict(M.deserialize_json(file["table"]))

                mtbl, mrows = convert_linked_table(tbl)
                mtbl.project = project  # type: ignore
                mtbl.save()

                for row in mrows:
                    row.save()
            else:
                assert False

            if file["sm"] is not None:
                sms = [
                    O.SemanticModel.from_dict(o) for o in M.deserialize_json(file["sm"])
                ]
            else:
                sms = []

            for i, sm in enumerate(sms):
                SemanticModel(
                    project=project,
                    table=mtbl,
                    name=f"sm-{i}",
                    description="",
                    version=1,
                    data=sm,
                ).save()


@click.group()
def cli():
    pass


cli.add_command(init)
cli.add_command(start)
cli.add_command(create)
cli.add_command(load)


if __name__ == "__main__":
    cli()
