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
    template_folder=os.path.join(PACKAGE_DIR, "www"),
    static_folder=os.path.join(PACKAGE_DIR, "www/static"),
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
