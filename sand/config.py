import os

from pathlib import Path


_ROOT_DIR = Path(os.path.abspath(__file__)).parent.parent
PACKAGE_DIR = str(Path(os.path.abspath(__file__)).parent)
FROM_SITEPACKAGES = _ROOT_DIR.name == "site-packages"

CACHE_SIZE = 10240

SETTINGS = {
    "entity": {
        "constructor": "sand.plugins.wikidata.get_entity_db",
        "uri2id": "sm.namespaces.prelude.WikidataNamespace.get_entity_id",
        "id2uri": "sm.namespaces.prelude.WikidataNamespace.get_entity_abs_uri",
        "args": {
            "dbfile": "/tmp/wdentities.db",
            "proxy": True,
        },
        # extra entities
        "default": "sand.models.entity.DEFAULT_ENTITY",
        # mapping from entity's namespace to the property id that will be used to indicate `instance_of` relationship
        "instanceof": {
            "http://www.wikidata.org": "P31",
        },
        # id of an nil entity
        "nil": "drepr:nil",
        # template for new entity uri
        "new_entity_template": "http://www.wikidata.org/entity/{id}",
    },
    "ont_classes": {
        "constructor": "sand.plugins.wikidata.get_ontclass_db",
        "uri2id": "sand.plugins.wikidata.uri2id",
        "args": {
            "dbfile": "/tmp/wdclasses.db",
            "proxy": True,
        },
        # extra classes
        "default": "sand.plugins.wikidata.WD_ONT_CLASSES",
    },
    "ont_props": {
        "constructor": "sand.plugins.wikidata.get_ontprop_db",
        "uri2id": "sand.plugins.wikidata.uri2id",
        "args": {
            "dbfile": "/tmp/wdprops.db",
            "proxy": True,
        },
        # extra props
        "default": "sand.models.ontology.DEFAULT_ONT_PROPS",
    },
    "semantic_model": {
        # list of properties' uris that when a column is tagged with one of them, the column is an entity column
        "identifiers": [
            "http://www.w3.org/2000/01/rdf-schema#label",
        ],
        # list of uri of classes that are used as intermediate nodes to represent n-ary relationships, e.g., wikidata's statement
        "statements": ["http://wikiba.se/ontology#Statement"],
    },
    "assistants": {
        # list of assistants' names and their models
        # "grams": "sand.plugins.grams.GRAMSAssistant",
        "mtab": "sand.plugins.mtab.MTabAssistant",
        # "default": "mtab",
    },
}
