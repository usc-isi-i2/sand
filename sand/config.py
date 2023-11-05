import os
from pathlib import Path

from minmod.db import MNDR_NS, MNDRNamespace
from rdflib import RDF

_ROOT_DIR = Path(os.path.abspath(__file__)).parent.parent
PACKAGE_DIR = str(Path(os.path.abspath(__file__)).parent)
FROM_SITEPACKAGES = _ROOT_DIR.name == "site-packages"

CACHE_SIZE = 10240

SETTINGS = {
    "entity": {
        "constructor": "minmod.sand.get_entity_db",
        "uri2id": "minmod.sand.WrappedEntity.uri2id",
        "id2uri": "minmod.sand.WrappedEntity.id2uri",
        "args": {
            "dbfile": "/Volumes/research/gramsplus/libraries/minmod/data/databases/entities.db",
        },
        # extra entities
        "default": "sand.models.entity.DEFAULT_ENTITY",
        # mapping from entity's namespace to the property id that will be used to indicate `instance_of` relationship
        "instanceof": {MNDR_NS: MNDRNamespace.create().get_rel_uri(str(RDF.type))},
        # id of an nil entity
        "nil": {"id": "drepr:nil", "uri": "https://purl.org/drepr/ontology/1.0/nil"},
        # template for new entity uri
        "new_entity_template": "http://www.wikidata.org/entity/{id}",
    },
    "ont_classes": {
        "constructor": "minmod.sand.get_ontclass_db",
        "uri2id": "minmod.sand.WrappedOntClass.uri2id",
        "id2uri": "minmod.sand.WrappedOntClass.id2uri",
        "args": {
            "dbfile": "/Volumes/research/gramsplus/libraries/minmod/data/databases/classes.db",
        },
        # extra classes
        "default": "sand.models.ontology.DEFAULT_ONT_CLASSES",
    },
    "ont_props": {
        "constructor": "minmod.sand.get_ontprop_db",
        "uri2id": "minmod.sand.WrappedOntClass.uri2id",
        "id2uri": "minmod.sand.WrappedOntClass.id2uri",
        "args": {
            "dbfile": "/Volumes/research/gramsplus/libraries/minmod/data/databases/props.db",
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
        # "grams": "sand.extensions.grams.GRAMSAssistant",
        # "mtab": "sand.extensions.assistants.mtab.MTabAssistant",
        "mtab": "minmod.sand.GramsMinModAssistant",
        # "default": "mtab",
    },
    "search": {
        "entities": "minmod.sand.mndr_search",
        "classes": "minmod.sand.mndr_search",
        "props": "minmod.sand.mndr_search",
    },
    "exports": {
        "drepr": "sand.extensions.export.drepr.main.DreprExport",
        "default": "sand.extensions.export.drepr.main.DreprExport",
    },
}
