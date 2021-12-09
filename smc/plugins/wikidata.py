from dataclasses import dataclass
from hugedict.misc import identity

from kgdata.wikidata import db
from kgdata.wikidata.models import QNode, DataValue, WDClass, WDProperty
from smc.models.base import StoreWrapper
from smc.models.entity import Entity, Statement, Value
from smc.models.ontology import OntClass, OntProperty


@dataclass
class WrapperWDEntity(Entity):
    @property
    def readable_label(self):
        return f"{self.label} ({self.id})"


@dataclass
class WrapperWDClass(OntClass):
    id: str = ""

    @property
    def readable_label(self):
        return f"{self.label} ({self.id})"


@dataclass
class WrapperWDProperty(OntProperty):
    id: str = ""

    @property
    def readable_label(self):
        return f"{self.label} ({self.id})"


def get_qnode_db(dbfile: str, proxy: bool):
    store = db.get_qnode_db(dbfile, proxy=proxy, read_only=not proxy, compression=True)
    return StoreWrapper(
        store,
        key_deser=identity,
        val_deser=qnode_deser,
    )


def get_ontclass_db(dbfile: str, proxy: bool):
    return StoreWrapper(
        db.get_wdclass_db(dbfile, proxy=proxy, read_only=not proxy, compression=False),
        key_deser=identity,
        val_deser=ont_class_deser,
    )


def get_ontprop_db(dbfile: str, proxy: bool):
    return StoreWrapper(
        db.get_wdprop_db(dbfile, proxy=proxy, read_only=not proxy, compression=False),
        key_deser=identity,
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
        label=qnode.label.lang2value,
        aliases=qnode.aliases.lang2values,
        description=qnode.description.lang2value,
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
    if val.is_entity_id():
        return Value(type="entityid", value=val.as_entity_id())
    elif val.is_string():
        return Value(type="string", value=val.as_string())
    else:
        return Value(type=val.type, value=val.value)  # type: ignore
