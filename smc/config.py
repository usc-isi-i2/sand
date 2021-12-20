import importlib
import os
from typing import Callable

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
        "uri2id": "grams.algorithm.wdont.WDOnt.get_qnode_id",
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


def import_func(func_ident: str) -> Callable:
    """Import function from string, e.g., smc.config.import_func"""
    lst = func_ident.rsplit(".", 2)
    if len(lst) == 2:
        module, func = lst
        cls = None
    else:
        module, cls, func = lst
        try:
            importlib.import_module(module + "." + cls)
            module = module + "." + cls
            cls = None
        except ModuleNotFoundError:
            pass

    module = importlib.import_module(module)
    if cls is not None:
        module = getattr(module, cls)

    return getattr(module, func)
