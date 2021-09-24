import os

from dotenv import load_dotenv
from pathlib import Path
from loguru import logger

_ROOT_DIR = Path(os.path.abspath(__file__)).parent.parent
PACKAGE_DIR = str(Path(os.path.abspath(__file__)).parent)
FROM_SITEPACKAGES = _ROOT_DIR.name == "site-packages"

if 'DBFILE' not in os.environ and FROM_SITEPACKAGES:
    envfile = str(_ROOT_DIR / ".env")
    logger.warning(
        "Environment variables are not specified! Manually load from `.env` file"
    )
    load_dotenv(envfile)


DBFILE = os.environ['DBFILE']
if DBFILE.startswith("%ROOT_DIR%"):
    # relative path from the root directory, we need to join between the current one
    DBFILE = os.path.abspath(_ROOT_DIR / DBFILE.replace("%ROOT_DIR%", ""))
else:
    DBFILE = os.path.abspath(DBFILE)


CACHE_SIZE = 10240

DAO_SETTINGS = {
    "entity": {
        "constructor": "smc.plugins.wikidata.get_qnode_db",
        "args": {
            "dbfile": "/tmp/qnode.db",
            "proxy": True,
        }
    },
    "ont_classes": {
        "constructor": "smc.plugins.wikidata.get_ontclass_db",
        "args": {
            "dbfile": "/tmp/wdclasses.db",
            "proxy": True,
        }
    },
    "ont_props": {
        "constructor": "smc.plugins.wikidata.get_ontprop_db",
        "args": {
            "dbfile": "/tmp/wdprops.db",
            "proxy": True,
        }
    }
}
