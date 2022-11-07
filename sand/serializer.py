from dataclasses import asdict
from functools import partial
from typing import Callable, Dict, List, Mapping, Optional

from playhouse.shortcuts import model_to_dict

import sm.outputs.semantic_model as O
from sand.models import SemanticModel, Table
from sand.models.entity import Entity, EntityAR
from sand.models.ontology import OntProperty, OntClass, OntPropertyAR, OntClassAR


def serialize_property(prop: OntProperty):
    return {
        "id": prop.id,
        "uri": prop.uri,
        "label": prop.label,
        "readable_label": prop.readable_label,
        "aliases": prop.aliases,
        "description": prop.description,
        "datatype": prop.datatype,
        "parents": prop.parents,
        "ancestors": list(prop.ancestors),
    }


def serialize_class(cls: OntClass):
    return {
        "id": cls.id,
        "uri": cls.uri,
        "label": cls.label,
        "readable_label": cls.readable_label,
        "aliases": cls.aliases,
        "description": cls.description,
        "parents": cls.parents,
        "ancestors": list(cls.ancestors),
    }


def serialize_entity(ent: Entity):
    return {
        "id": ent.id,
        "uri": Entity.id2uri(ent.id),
        "readable_label": ent.readable_label,
        "label": ent.label.to_dict(),
        "aliases": ent.aliases.to_dict(),
        "description": ent.description.to_dict(),
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


def serialize_graph(
    sm: O.SemanticModel,
    uri2label: Callable[[str, bool], Optional[str]],
    columns: Optional[List[str]] = None,
):
    nodes = []
    for n in sm.iter_nodes():
        if isinstance(n, O.ClassNode):
            nodes.append(
                {
                    "id": str(n.id),
                    "uri": n.abs_uri,
                    "label": uri2label(n.abs_uri, True) or n.rel_uri,
                    "approximation": n.approximation,
                    "type": "class_node",
                }
            )
        elif isinstance(n, O.DataNode):
            nodes.append(
                {
                    "id": str(n.id),
                    "label": columns[n.col_index] if columns is not None else n.label,
                    "type": "data_node",
                    "column_index": n.col_index,
                }
            )
        else:
            if n.datatype == O.LiteralNodeDataType.Entity:
                value = {
                    "id": Entity.uri2id(n.value),
                    "uri": n.value,
                    "type": n.datatype.value,
                }
            else:
                value = {"type": n.datatype.value, "value": n.value}
            nodes.append(
                {
                    "id": str(n.id),
                    "value": value,
                    "label": n.label,
                    "type": "literal_node",
                    "is_in_context": n.is_in_context,
                }
            )

    edges = [
        {
            "source": str(e.source),
            "target": str(e.target),
            "uri": e.abs_uri,
            "label": e.readable_label or uri2label(e.abs_uri, False) or e.rel_uri,
            "approximation": e.approximation,
        }
        for e in sm.iter_edges()
    ]

    return dict(nodes=nodes, edges=edges)


def batch_serialize_sms(sms: List[SemanticModel]):
    # tbls = {sm.table_id for sm in sms if sm.table_id is not None}  # type: ignore
    # tbls = {
    #     tbl.id: tbl
    #     for tbl in Table.select(Table.id, Table.columns).where(Table.id.in_(tbls))  # type: ignore
    # }

    ontprops = OntPropertyAR()
    ontclasses = OntClassAR()
    uri2lbl = partial(get_label, ontprops=ontprops, ontclasses=ontclasses)

    output = []
    for sm in sms:
        r = model_to_dict(sm, recurse=False)
        if r["data"] is not None:
            # columns = None if sm.table_id is None else tbls[sm.table_id].columns
            columns = None
            r["data"] = serialize_graph(r["data"], uri2lbl, columns)  # type: ignore
        output.append(r)
    return output


def get_label(
    id: str,
    is_class: bool,
    ontprops: Mapping[str, OntProperty],
    ontclasses: Mapping[str, OntClass],
) -> Optional[str]:
    if is_class:
        if id in ontclasses:
            return ontclasses[id].readable_label
        elif id in ontprops:
            return ontprops[id].readable_label
    else:
        if id in ontprops:
            return ontprops[id].readable_label
        elif id in ontclasses:
            return ontclasses[id].readable_label
    return None
