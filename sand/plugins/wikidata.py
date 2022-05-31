from dataclasses import dataclass
from typing import Mapping
from hugedict.misc import identity
from itertools import chain
from kgdata.wikidata import db
from kgdata.wikidata.models import WDEntity, WDValue, WDClass, WDProperty
from sm.namespaces.wikidata import WikidataNamespace
from sand.models.base import StoreWrapper
from sand.models.entity import Entity, Statement, Value
from sand.models.ontology import (
    DEFAULT_ONT_PROPS,
    OntClass,
    OntProperty,
    DEFAULT_ONT_CLASSES,
    OntPropertyDataType,
)


wdns = WikidataNamespace.create()
WD_ONT_CLASSES = {
    wdns.get_rel_uri(wdns.STATEMENT_URI): OntClass(
        id=wdns.get_rel_uri(wdns.STATEMENT_URI),
        uri=wdns.STATEMENT_URI,
        label=wdns.get_rel_uri(wdns.STATEMENT_URI),
        aliases=[],
        description="",
        parents=[],
    )
}
WD_ONT_CLASSES.update(DEFAULT_ONT_CLASSES)
INVERSE_DEFAULT_URI2ID = {
    v.uri: k for k, v in chain(DEFAULT_ONT_PROPS.items(), WD_ONT_CLASSES.items())
}

WD_DATATYPE_MAPPING: Mapping[str, OntPropertyDataType] = {
    "monolingualtext": "monolingualtext",
    "url": "url",
    "wikibase-item": "entity",
    "external-id": "entity",
    "time": "datetime",
    "quantity": "number",
    "string": "string",
    "globe-coordinate": "globe-coordinate",
}


@dataclass
class WrapperWDEntity(Entity):
    @property
    def readable_label(self):
        return f"{self.label} ({self.id})"

    @property
    def instanceof(self):
        """Get the property representing the instanceof relation."""
        return "P31"


@dataclass
class WrapperWDClass(OntClass):
    @property
    def readable_label(self):
        return f"{self.label} ({self.id})"


@dataclass
class WrapperWDProperty(OntProperty):
    @property
    def readable_label(self):
        return f"{self.label} ({self.id})"


def get_entity_db(dbfile: str, proxy: bool):
    store = db.get_entity_db(dbfile, proxy=proxy, read_only=not proxy)
    return StoreWrapper(
        store,
        key_deser=identity,
        val_deser=qnode_deser,
    )


def get_ontclass_db(dbfile: str, proxy: bool):
    return StoreWrapper(
        db.get_wdclass_db(dbfile, proxy=proxy, read_only=not proxy),
        key_deser=get_wdclass_id,
        val_deser=ont_class_deser,
    )


def get_ontprop_db(dbfile: str, proxy: bool):
    return StoreWrapper(
        db.get_wdprop_db(dbfile, proxy=proxy, read_only=not proxy),
        key_deser=get_wdprop_id,
        val_deser=ont_prop_deser,
    )


def qnode_deser(qnode: WDEntity):
    props = {}
    for pid, stmts in qnode.props.items():
        new_stmts = []
        for stmt in stmts:
            new_stmt = Statement(
                value=wd_value_deser(stmt.value),
                qualifiers={
                    qid: [wd_value_deser(x) for x in lst]
                    for qid, lst in stmt.qualifiers.items()
                },
                qualifiers_order=stmt.qualifiers_order,
            )
            new_stmts.append(new_stmt)
        props[pid] = new_stmts

    return WrapperWDEntity(
        id=qnode.id,
        label=qnode.label,
        aliases=qnode.aliases,
        description=qnode.description,
        properties=props,
    )


def ont_class_deser(item: WDClass):
    return WrapperWDClass(
        id=item.id,
        uri=WikidataNamespace.get_entity_abs_uri(item.id),
        aliases=item.aliases,
        label=item.label,
        description=item.description,
        parents=item.parents,
        ancestors=item.ancestors,
    )


def ont_prop_deser(item: WDProperty):
    global WD_DATATYPE_MAPPING
    return WrapperWDProperty(
        id=item.id,
        uri=WikidataNamespace.get_prop_abs_uri(item.id),
        aliases=item.aliases,
        label=item.label,
        description=item.description,
        datatype=WD_DATATYPE_MAPPING[item.datatype] if item.datatype in WD_DATATYPE_MAPPING else "unknown",
        parents=item.parents,
        ancestors=item.ancestors,
    )


def wd_value_deser(val: WDValue):
    if val.is_entity_id(val):
        return Value(type="entityid", value=val.as_entity_id())
    elif val.is_string(val):
        return Value(type="string", value=val.as_string())
    else:
        return Value(type=val.type, value=val.value)


def get_wdprop_id(uri_or_id: str):
    if uri_or_id.startswith("http"):
        return uri_or_id.replace(f"http://www.wikidata.org/prop/", "")
    return uri_or_id


def get_wdclass_id(uri_or_id: str):
    if uri_or_id.startswith("http"):
        return uri_or_id.replace(f"http://www.wikidata.org/entity/", "")
    return uri_or_id


def uri2id(uri: str):
    if uri.startswith("http://www.wikidata.org/prop/"):
        return WikidataNamespace.get_prop_id(uri)
    if uri.startswith("http://www.wikidata.org/entity/"):
        return WikidataNamespace.get_entity_id(uri)
    if uri in INVERSE_DEFAULT_URI2ID:
        return INVERSE_DEFAULT_URI2ID[uri]
    return uri


def get_rel_uri(uri: str):
    return wdns.get_rel_uri(uri)
