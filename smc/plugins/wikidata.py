from dataclasses import dataclass

from kgdata.wikidata import db
from kgdata.wikidata.models import QNode, DataValue, WDClass, WDProperty
from smc.models.base import StoreWrapper
from smc.models.entity import Entity, Statement, Value, ValueType
from smc.models.ontology import OntClass, OntProperty


@dataclass
class WrapperQNode(Entity):
    id: str

    @property
    def readable_label(self):
        return f"{self.label} ({self.id})"


@dataclass
class WrapperWDClass(OntClass):
    id: str = None

    @property
    def readable_label(self):
        return f"{self.label} ({self.id})"


@dataclass
class WrapperWDProperty(OntProperty):
    id: str = None

    @property
    def readable_label(self):
        return f"{self.label} ({self.id})"


def get_qnode_db(dbfile: str, proxy: bool):
    return StoreWrapper(
        db.get_qnode_db(dbfile, proxy=proxy, read_only=not proxy, compression=True),
        key_deser=uri2id,
        val_deser=qnode_deser,
    )


def get_ontclass_db(dbfile: str, proxy: bool):
    return StoreWrapper(
        db.get_wdclass_db(dbfile, proxy=proxy, read_only=not proxy, compression=True),
        key_deser=uri2id,
        val_deser=ont_class_deser,
    )


def get_ontprop_db(dbfile: str, proxy: bool):
    return StoreWrapper(
        db.get_wdclass_db(dbfile, proxy=proxy, read_only=not proxy, compression=True),
        key_deser=uri2id,
        val_deser=ont_prop_deser,
    )


def uri2id(uri: str):
    if uri.startswith("http://www.wikidata.org/"):
        uri = uri.replace("http://www.wikidata.org/entity/", "")
        uri = uri.replace("http://www.wikidata.org/prop/", "")
    elif uri.startswith("http://wikidata.org/"):
        uri = uri.replace("http://wikidata.org/entity/", "")
        uri = uri.replace("http://wikidata.org/prop/", "")
    return uri


def qnode_deser(qnode: QNode):
    props = {}
    for pid, stmts in qnode.props.items():
        new_stmts = []
        for stmt in stmts:
            new_stmt = Statement(
                value=wd_value_deser(stmt.value),
                qualifiers={
                    f"http://www.wikidata.org/prop/{qid}": [
                        wd_value_deser(x) for x in lst
                    ]
                    for qid, lst in stmt.qualifiers.items()
                },
            )
            new_stmts.append(new_stmt)
        props[f"http://www.wikidata.org/prop/{pid}"] = new_stmts
    return WrapperQNode(
        id=qnode.id,
        uri=f"http://www.wikidata.org/entity/{qnode.id}",
        label=qnode.label,
        description=qnode.description,
        properties=props,
    )


def ont_class_deser(item: WDClass):
    parents = [f"http://www.wikidata.org/entity/{p}" for p in item.parents]
    parents_closure = {
        f"http://www.wikidata.org/entity/{p}" for p in item.parents_closure
    }
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
    parents = [f"http://www.wikidata.org/entity/{p}" for p in item.parents]
    parents_closure = {
        f"http://www.wikidata.org/entity/{p}" for p in item.parents_closure
    }
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
    if val.is_qnode():
        ent_id = val.as_qnode_id()
        if ent_id.startswith("Q"):
            uri = f"http://www.wikidata.org/entity/{ent_id}"
        elif ent_id.startswith("P"):
            uri = f"http://www.wikidata.org/prop/{ent_id}"
        else:
            uri = ent_id
        return Value(type=ValueType.URI, value=uri)
    if val.is_quantity():
        return Value(type=ValueType.Float, value=val.value["amount"])
    return Value(type=ValueType.String, value=val.to_string_repr())
