import os

from dotenv import load_dotenv
from pathlib import Path
from loguru import logger

_ROOT_DIR = Path(os.path.abspath(__file__)).parent.parent
PACKAGE_DIR = str(Path(os.path.abspath(__file__)).parent)
FROM_SITEPACKAGES = _ROOT_DIR.name == "site-packages"

CACHE_SIZE = 10240

DAO_SETTINGS = {
    "entity": {
        "constructor": "smc.plugins.wikidata.get_qnode_db",
        "args": {
            "dbfile": "/tmp/qnodes.db",
            "proxy": True,
        },
    },
    "ont_classes": {
        "constructor": "smc.plugins.wikidata.get_ontclass_db",
        "args": {
            "dbfile": "/tmp/wdclasses.db",
            "proxy": True,
        },
    },
    "ont_props": {
        "constructor": "smc.plugins.wikidata.get_ontprop_db",
        "args": {
            "dbfile": "/tmp/wdprops.db",
            "proxy": True,
        },
    },
}
