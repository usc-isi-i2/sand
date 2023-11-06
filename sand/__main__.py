from typing import Optional

import click
from loguru import logger
from peewee import fn
from sand.commands.load import load_dataset
from sand.config import APP_CONFIG, AppConfig
from sand.models import Project, SemanticModel, Table, TableRow
from sand.models import db as dbconn
from sand.models import init_db
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.wsgi import WSGIContainer


@click.command()
@click.option("-d", "--db", required=True, help="sand database file")
def init(db):
    """Init database"""
    init_db(db)
    dbconn.create_tables([Project, Table, TableRow, SemanticModel], safe=True)
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

    if config is not None:
        APP_CONFIG.update(AppConfig.from_yaml(config))

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
@click.option("-d", "--db", required=True, help="sand database file")
@click.option("--description", required=True, help="Description of the project")
@click.argument("name")
def create(db, description: str, name: str):
    """Create project if not exist"""
    init_db(db)
    Project(name=name, description=description).save()


@click.group()
def cli():
    pass


cli.add_command(init)
cli.add_command(start)
cli.add_command(create)
cli.add_command(load_dataset)


if __name__ == "__main__":
    cli()
