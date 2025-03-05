from typing import Optional

import click
from loguru import logger
from peewee import fn
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.wsgi import WSGIContainer

from sand.app import get_flask_app
from sand.commands.load import load_dataset
from sand.container import use_container
from sand.helpers.dependency_injection import use_auto_inject
from sand.models import Project, SemanticModel, Table, TableRow, Transformation
from sand.models import db as dbconn
from sand.models import init_db


@click.command()
@click.option("-d", "--db", required=True, help="sand database file")
def init(db):
    """Init database"""
    init_db(db)
    dbconn.create_tables(
        [Project, Table, TableRow, SemanticModel, Transformation], safe=True
    )
    if Project.select().where(fn.Lower(Project.name) == "default").count() == 0:
        Project(name="Default", description="The default project").save()


@click.command()
@click.option("-d", "--db", required=True, help="sand database file")
@click.option(
    "-c",
    "--config",
    help="Path to the configuration file",
)
@click.option("--wsgi", is_flag=True, help="Whether to use wsgi server")
@click.option("-p", "--port", default=5524, help="Listening port")
@click.option(
    "--certfile", default=None, help="Path to the certificate signing request"
)
@click.option("--keyfile", default=None, help="Path to the key file")
def start(
    db: str,
    config: Optional[str],
    wsgi: bool,
    port: int,
    certfile: str,
    keyfile: str,
):
    init_db(db)

    if certfile is None or keyfile is None:
        ssl_options = None
    else:
        ssl_options = {"certfile": certfile, "keyfile": keyfile}
        assert not wsgi

    with use_container(config) as container:
        with use_auto_inject(container):
            app = get_flask_app()

            if wsgi:
                app.run(host="0.0.0.0", port=port)
            else:
                logger.info("Start server in non-wsgi mode")
                http_server = HTTPServer(WSGIContainer(app), ssl_options=ssl_options)
                http_server.listen(address="0.0.0.0", port=port)
                IOLoop.instance().start()


@click.command()
@click.option("-d", "--db", required=True, help="sand database file")
@click.option("--description", help="Description of the project")
@click.argument("name")
def create(db, description: Optional[str], name: str):
    """Create project if not exist"""
    init_db(db)
    Project(name=name, description=description or name).save()


@click.command(help="Remove a project")
@click.option("-d", "--db", required=True, help="sand database file")
@click.argument("name")
def remove(db, name: str):
    """Create project if not exist"""
    init_db(db)
    Project.get(name=name).delete_instance()


@click.group()
def cli():
    pass


cli.add_command(init)
cli.add_command(start)
cli.add_command(create)
cli.add_command(remove)
cli.add_command(load_dataset)


if __name__ == "__main__":
    cli()
