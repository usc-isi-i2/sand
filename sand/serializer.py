from dataclasses import asdict
from typing import List, Optional

import sm.outputs.semantic_model as O
from playhouse.shortcuts import model_to_dict
from sand.config import APP_CONFIG
from sand.models import SemanticModel
from sand.models.entity import Entity
from sand.models.ontology import OntClass, OntClassAR, OntProperty, OntPropertyAR

ontclass_ar = OntClassAR()
ontprop_ar = OntPropertyAR()
kgns = APP_CONFIG.get_kgns()


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
        "ancestors": list(prop.ancestors.keys()),
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
        "ancestors": list(cls.ancestors.keys()),
    }


def serialize_entity(ent: Entity):
    return {
        "id": ent.id,
        "uri": ent.uri,
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
    columns: Optional[List[str]] = None,
):
    nodes = []
    for n in sm.iter_nodes():
        if isinstance(n, O.ClassNode):
            nodes.append(
                {
                    "id": str(n.id),
                    "uri": n.abs_uri,
                    "label": tmp.readable_label
                    if (tmp := ontclass_ar.get_by_uri(n.abs_uri)) is not None
                    else n.rel_uri,
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
                    "id": kgns.uri_to_id(n.value),
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
            "label": e.readable_label
            or (
                tmp.readable_label
                if (tmp := ontprop_ar.get_by_uri(e.abs_uri)) is not None
                else e.rel_uri
            ),
            "approximation": e.approximation,
        }
        for e in sm.iter_edges()
    ]

    return dict(nodes=nodes, edges=edges)


def batch_serialize_sms(sms: List[SemanticModel]):
    output = []
    for sm in sms:
        r = model_to_dict(sm, recurse=False)
        if r["data"] is not None:
            # columns = None if sm.table_id is None else tbls[sm.table_id].columns
            columns = None
            r["data"] = serialize_graph(r["data"], columns)  # type: ignore
        output.append(r)
    return output
