import os

from pathlib import Path


_ROOT_DIR = Path(os.path.abspath(__file__)).parent.parent
PACKAGE_DIR = str(Path(os.path.abspath(__file__)).parent)
FROM_SITEPACKAGES = _ROOT_DIR.name == "site-packages"

CACHE_SIZE = 10240

DAO_SETTINGS = {
    "entity": {
        "constructor": "smc.plugins.wikidata.get_qnode_db",
        "uri2id": "grams.algorithm.wdont.WDOnt.get_qnode_id",
        "id2uri": "grams.algorithm.wdont.WDOnt.get_qnode_uri",
        "args": {
            "dbfile": "/tmp/qnodes.db",
            "proxy": True,
        },
    },
    "ont_classes": {
        "constructor": "smc.plugins.wikidata.get_ontclass_db",
        "uri2id": "smc.plugins.wikidata.uri2id",
        "args": {
            "dbfile": "/tmp/wdclasses.db",
            "proxy": True,
        },
    },
    "ont_props": {
        "constructor": "smc.plugins.wikidata.get_ontprop_db",
        "uri2id": "smc.plugins.wikidata.uri2id",
        "args": {
            "dbfile": "/tmp/wdprops.db",
            "proxy": True,
        },
    },
}
