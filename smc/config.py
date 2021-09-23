import os

from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = str(Path(os.path.abspath(__file__)).parent.parent)
PACKAGE_DIR = str(Path(os.path.abspath(__file__)).parent)

if 'DBFILE' not in os.environ:
    import warnings
    warnings.warn(
        "Environment variables are not specified! Manually load from `.env` file"
    )
    envfile = os.path.join(ROOT_DIR, ".env")
    load_dotenv(envfile)

DBFILE = os.environ['DBFILE']
if DBFILE.startswith("."):
    # relative path, we need to join between the current one
    DBFILE = os.path.abspath(os.path.join(ROOT_DIR, DBFILE))
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
