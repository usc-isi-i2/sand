import importlib
import logging
import os
import pkgutil

import smc.controllers as controllers
from flask import Flask, Blueprint, render_template
from loguru import logger
from smc.config import PACKAGE_DIR


if os.environ.get("FLASK_ENV", "") == "development":
    # if debugging, log the SQL queries
    logger = logging.getLogger("peewee")
    logger.addHandler(logging.StreamHandler())
    logger.setLevel(logging.DEBUG)


app = Flask(
    __name__,
    template_folder=os.path.join(PACKAGE_DIR, "www/build"),
    static_folder=os.path.join(PACKAGE_DIR, "www/build/static"),
    static_url_path="/static",
)
app.config["JSON_SORT_KEYS"] = False


@app.route("/", defaults={"_path": ""})
@app.route("/<path:_path>")
def home(_path):
    return render_template("index.html")


blueprints = []
for m in pkgutil.iter_modules(controllers.__path__):
    controller = importlib.import_module(f"smc.controllers.{m.name}")
    for attrname in dir(controller):
        attr = getattr(controller, attrname)
        if isinstance(attr, Blueprint):
            blueprints.append(attr)


for bp in blueprints:
    app.register_blueprint(bp, url_prefix="/api")


if __name__ == "__main__":
    import click
    from tornado.wsgi import WSGIContainer
    from tornado.httpserver import HTTPServer
    from tornado.ioloop import IOLoop

    @click.command()
    @click.option(
        "--no_wsgi", type=bool, default=False, help="Whether to use non-wsgi server"
    )
    @click.option(
        "--certfile", default=None, help="Path to the certificate signing request"
    )
    @click.option("--keyfile", default=None, help="Path to the key file")
    def main(no_wsgi: bool, certfile: str, keyfile: str):
        if certfile is None or keyfile is None:
            ssl_options = None
        else:
            ssl_options = {"certfile": certfile, "keyfile": keyfile}
            assert no_wsgi

        if no_wsgi:
            logger.info("Start server in non-wsgi mode")
            http_server = HTTPServer(WSGIContainer(app), ssl_options=ssl_options)
            http_server.listen(5524)
            IOLoop.instance().start()
        else:
            app.run(host="0.0.0.0", port=5524)

    main()
