from dataclasses import asdict
from functools import partial
from typing import Dict, List, Optional

from playhouse.shortcuts import model_to_dict

import sm.outputs as O
from smc.models import SemanticModel, Table
from smc.models.entity import Entity, EntityAR
from smc.models.ontology import OntProperty, OntClass, OntPropertyAR, OntClassAR


def serialize_entity(ent: Entity):
    return {
        "id": ent.id,
        "label": ent.label,
        "aliases": ent.aliases,
        "description": ent.description,
        "properties": {
            prop: [
                {
                    "value": asdict(stmt.value),
                    "qualifiers": {
                        qid: [asdict(qval) for qval in qvals]
                        for qid, qvals in stmt.qualifiers.items()
                    },
                    "qualifiers_order": stmt.qualifiers_order,
                }
                for stmt in stmts
            ]
            for prop, stmts in ent.properties.items()
        },
    }


def serialize_graph(sm: O.SemanticModel, uri2lbl, columns: List[str]):
    nodes = []
    for n in sm.iter_nodes():
        if n.is_class_node:
            nodes.append(
                {
                    "id": n.id,
                    "uri": n.abs_uri,
                    "label": uri2lbl(n.abs_uri, False, True) or n.rel_uri,
                    "approximation": n.approximation,
                    "isClassNode": True,
                    "isDataNode": False,
                    "isLiteralNode": False,
                }
            )
        elif n.is_data_node:
            nodes.append(
                {
                    "id": n.id,
                    "label": columns[n.col_index],
                    "isClassNode": False,
                    "isDataNode": True,
                    "isLiteralNode": False,
                    "columnIndex": n.col_index,
                }
            )
        else:
            nodes.append(
                {
                    "id": n.id,
                    "uri": n.value
                    if n.datatype == O.LiteralNodeDataType.Entity
                    else "",
                    "label": n.label,
                    "isClassNode": False,
                    "isDataNode": False,
                    "isLiteralNode": True,
                    "isInContext": n.is_in_context,
                    "datatype": n.datatype.value,
                }
            )

    edges = [
        {
            "source": e.source,
            "target": e.target,
            "uri": e.abs_uri,
            "label": uri2lbl(e.abs_uri, False, False) or e.rel_uri,
            "approximation": e.approximation,
        }
        for e in sm.iter_edges()
    ]

    return dict(nodes=nodes, edges=edges)


def serialize_sm(sm: SemanticModel):
    entities = EntityAR()
    ontprops = OntPropertyAR()
    ontclasses = OntClassAR()

    uri2lbl = partial(
        get_label, entities=entities, ontprops=ontprops, ontclasses=ontclasses
    )
    output = model_to_dict(sm, recurse=False)
    output["data"] = serialize_graph(output["data"], uri2lbl, sm.table.columns)
    return output


def batch_serialize_sms(sms: List[SemanticModel]):
    tbls = {sm.table_id for sm in sms}
    tbls = {
        tbl.id: tbl
        for tbl in Table.select(Table.id, Table.columns).where(Table.id.in_(tbls))
    }

    entities = EntityAR()
    ontprops = OntPropertyAR()
    ontclasses = OntClassAR()

    uri2lbl = partial(
        get_label, entities=entities, ontprops=ontprops, ontclasses=ontclasses
    )

    output = []
    for sm in sms:
        r = model_to_dict(sm, recurse=False)
        r["data"] = serialize_graph(r["data"], uri2lbl, tbls[sm.table_id].columns)
        output.append(r)
    return output


def get_label(
    id: str,
    is_entity: bool,
    is_class: bool,
    entities: Dict[str, Entity],
    ontprops: Dict[str, OntProperty],
    ontclasses: Dict[str, OntClass],
) -> Optional[str]:
    if is_entity:
        if id in entities:
            return entities[id].readable_label
        elif id in ontclasses:
            return ontclasses[id].readable_label
        elif id in ontprops:
            return ontprops[id].readable_label
    elif is_class:
        if id in ontclasses:
            return ontclasses[id].readable_label
        elif id in ontprops:
            return ontprops[id].readable_label
        elif id in entities:
            return entities[id].readable_label
    else:
        if id in ontprops:
            return ontprops[id].readable_label
        elif id in ontclasses:
            return ontclasses[id].readable_label
        elif id in entities:
            return entities[id].readable_label
    return None
