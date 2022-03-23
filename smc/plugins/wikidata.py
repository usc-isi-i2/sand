from dataclasses import dataclass
from grams.algorithm.wdont import WDOnt
from hugedict.misc import identity
from itertools import chain
from kgdata.wikidata import db
from kgdata.wikidata.models import QNode, DataValue, WDClass, WDProperty
from rdflib.namespace import RDFS
from smc.models.base import StoreWrapper
from smc.models.entity import Entity, Statement, Value
from smc.models.ontology import (
    DEFAULT_ONT_PROPS,
    OntClass,
    OntProperty,
    DEFAULT_ONT_CLASSES,
)


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


def get_qnode_db(dbfile: str, proxy: bool):
    store = db.get_qnode_db(dbfile, proxy=proxy, read_only=not proxy)
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


def qnode_deser(qnode: QNode):
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
    parents = item.parents
    parents_closure = item.parents_closure
    return WrapperWDClass(
        id=item.id,
        uri=item.get_uri(),
        aliases=item.aliases,
        label=item.label,
        description=item.description,
        parents=parents,
        parents_closure=parents_closure,
    )


def ont_prop_deser(item: WDProperty):
    parents = item.parents
    parents_closure = item.parents_closure
    return WrapperWDProperty(
        id=item.id,
        uri=item.get_uri(),
        aliases=item.aliases,
        label=item.label,
        description=item.description,
        parents=parents,
        parents_closure=parents_closure,
    )


def wd_value_deser(val: DataValue):
    if val.is_entity_id():
        return Value(type="entityid", value=val.as_entity_id())
    elif val.is_string():
        return Value(type="string", value=val.as_string())
    else:
        return Value(type=val.type, value=val.value)  # type: ignore


def get_wdprop_id(uri_or_id: str):
    return uri_or_id.replace(f"http://www.wikidata.org/prop/", "")


def get_wdclass_id(uri_or_id: str):
    return uri_or_id.replace(f"http://www.wikidata.org/entity/", "")


WD_ONT_CLASSES = {
    WDOnt.STATEMENT_REL_URI: OntClass(
        id=WDOnt.STATEMENT_REL_URI,
        uri=WDOnt.STATEMENT_URI,
        label=WDOnt.STATEMENT_REL_URI,
        aliases=[],
        description="",
        parents=[],
    )
}
WD_ONT_CLASSES.update(DEFAULT_ONT_CLASSES)
INVERSE_DEFAULT_URI2ID = {
    v.uri: k for k, v in chain(DEFAULT_ONT_PROPS.items(), WD_ONT_CLASSES.items())
}


def uri2id(uri: str):
    if uri.startswith("http://www.wikidata.org/prop/"):
        return WDOnt.get_prop_id(uri)
    if uri.startswith("http://www.wikidata.org/entity/"):
        return WDOnt.get_qnode_id(uri)
    if uri in INVERSE_DEFAULT_URI2ID:
        return INVERSE_DEFAULT_URI2ID[uri]
    return uri


def get_rel_uri(uri: str):
    if WDOnt.is_uri_statement(uri):
        return WDOnt.STATEMENT_REL_URI
    if WDOnt.is_uri_qnode(uri):
        return WDOnt.get_qnode_rel_uri(WDOnt.get_qnode_id(uri))
    if WDOnt.is_uri_property(uri):
        return WDOnt.get_prop_rel_uri(WDOnt.get_prop_id(uri))
    if uri == str(RDFS.label):
        return "rdfs:label"
    return uri
