import glob
import os
from pathlib import Path

import click
from loguru import logger
from peewee import fn
from sm.prelude import M, O
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.wsgi import WSGIContainer
from tqdm.auto import tqdm

from sand.config import SETTINGS
from sand.models import (
    Project,
    SemanticModel,
    Table,
    TableRow,
    db as dbconn,
    init_db,
)
from sand.plugins.grams_plugin import convert_linked_table


@click.command()
@click.option("-d", "--db", required=True, help="smc database file")
def init(db):
    """Init database"""
    init_db(db)
    dbconn.create_tables([Project, Table, TableRow, SemanticModel], safe=True)
    if Project.select().where(fn.Lower(Project.name) == "default").count() == 0:
        Project(name="Default", description="The default project").save()


@click.command()
@click.option("-d", "--db", required=True, help="smc database file")
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
    db: str,
    externaldb: str,
    externaldb_proxy: bool,
    wsgi: bool,
    port: int,
    certfile: str,
    keyfile: str,
):
    init_db(db)

    if externaldb.strip() != "":
        for cfg in [SETTINGS[k] for k in ["entity", "ont_classes", "ont_props"]]:
            cfg["args"]["dbfile"] = os.path.join(
                externaldb, Path(cfg["args"]["dbfile"]).name
            )
            cfg["args"]["proxy"] = externaldb_proxy

    if certfile is None or keyfile is None:
        ssl_options = None
    else:
        ssl_options = {"certfile": certfile, "keyfile": keyfile}
        assert not wsgi

    from sand.app import app

    if wsgi:
        app.run(host="0.0.0.0", port=port)
    else:
        logger.info("Start server in non-wsgi mode")
        http_server = HTTPServer(WSGIContainer(app), ssl_options=ssl_options)
        http_server.listen(port)
        IOLoop.instance().start()


@click.command()
@click.option("-d", "--db", required=True, help="smc database file")
@click.option("--description", required=True, help="Description of the project")
@click.argument("name")
def create(db, description: str, name: str):
    """Create project if not exist"""
    init_db(db)
    Project(name=name, description=description).save()


@click.command()
@click.option("-d", "--db", required=True, help="smc database file")
@click.option("-p", "--project", default="default", help="Project name")
@click.option("-t", "--tables", required=True, help="Path to tables")
@click.option("--descriptions", default="", help="Path to semantic models of tables")
def load(db, project: str, tables: str, descriptions: str):
    """Load data into the project"""
    init_db(db)
    with dbconn:
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
