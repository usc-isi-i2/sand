from dataclasses import dataclass
from typing import Mapping

from hugedict.misc import identity
from kgdata.wikidata import db
from kgdata.wikidata.models import WDClass, WDEntity, WDProperty, WDValue
from sm.namespaces.wikidata import WikidataNamespace

from sand.models.base import StoreWrapper
from sand.models.entity import Entity, Statement, Value
from sand.models.ontology import OntClass, OntProperty, OntPropertyDataType

kgns = WikidataNamespace.create()


def get_default_classes():
    return {
        kgns.get_rel_uri(kgns.statement_uri): OntClass(
            id=kgns.get_rel_uri(kgns.statement_uri),
            uri=kgns.statement_uri,
            label=kgns.get_rel_uri(kgns.statement_uri),
            aliases=[],
            description="Describes the claim of a statement and list references for this claim",
            parents=[],
        )
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
        db.get_class_db(dbfile, proxy=proxy, read_only=not proxy),
        key_deser=get_wdclass_id,
        val_deser=ont_class_deser,
    )


def get_ontprop_db(dbfile: str, proxy: bool):
    return StoreWrapper(
        db.get_prop_db(dbfile, proxy=proxy, read_only=not proxy),
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
        uri=kgns.id_to_uri(qnode.id),
        label=qnode.label,
        aliases=qnode.aliases,
        description=qnode.description,
        properties=props,
    )


def ont_class_deser(item: WDClass):
    return WrapperWDClass(
        id=item.id,
        uri=kgns.id_to_uri(item.id),
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
        uri=kgns.id_to_uri(item.id),
        aliases=item.aliases,
        label=item.label,
        description=item.description,
        datatype=WD_DATATYPE_MAPPING[item.datatype]
        if item.datatype in WD_DATATYPE_MAPPING
        else "unknown",
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
