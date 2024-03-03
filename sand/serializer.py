from __future__ import annotations

from dataclasses import asdict
from typing import List, Optional

import sm.outputs.semantic_model as O
from dependency_injector.wiring import Provide, inject
from playhouse.shortcuts import model_to_dict
from sm.misc.funcs import assert_not_null

from sand.helpers.namespace import NamespaceService
from sand.models import SemanticModel
from sand.models.entity import Entity
from sand.models.ontology import OntClass, OntProperty


def serialize_property(obj: OntProperty):
    return {
        "id": obj.id,
        "uri": obj.uri,
        "label": obj.label,
        "readable_label": obj.readable_label,
        "aliases": obj.aliases,
        "description": obj.description,
        "datatype": obj.datatype,
        "parents": obj.parents,
        "ancestors": list(obj.ancestors.keys()),
    }


def serialize_class(obj: OntClass):
    return {
        "id": obj.id,
        "uri": obj.uri,
        "label": obj.label,
        "readable_label": obj.readable_label,
        "aliases": obj.aliases,
        "description": obj.description,
        "parents": obj.parents,
        "ancestors": list(obj.ancestors.keys()),
    }


def serialize_entity(obj: Entity):
    return {
        "id": obj.id,
        "uri": obj.uri,
        "readable_label": obj.readable_label,
        "label": obj.label.to_dict(),
        "aliases": obj.aliases.to_dict(),
        "description": obj.description.to_dict(),
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
            for prop, stmts in obj.properties.items()
        },
    }


@inject
def serialize_graph(
    sm: O.SemanticModel,
    columns: Optional[List[str]] = None,
    namespace: NamespaceService = Provide["namespace"],
    # ontclass_ar: OntClassAR = Provide["classes"],
):
    nodes = []
    for n in sm.iter_nodes():
        if isinstance(n, O.ClassNode):
            nodes.append(
                {
                    "id": str(n.id),
                    "uri": n.abs_uri,
                    "label": n.label,
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
                    "id": namespace.uri_to_id(n.value),
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
            "label": e.label,
            # "label": e.readable_label
            # or (
            #     tmp.readable_label
            #     if (tmp := self.ontprop_ar.get_by_uri(e.abs_uri)) is not None
            #     else e.rel_uri
            # ),
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
