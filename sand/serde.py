from __future__ import annotations

from dataclasses import asdict
from typing import TYPE_CHECKING, List, Optional

import sm.outputs.semantic_model as O
from playhouse.shortcuts import model_to_dict
from sand.models import SemanticModel
from sand.models.entity import Entity
from sand.models.ontology import OntClass, OntProperty
from sm.outputs.semantic_model import LiteralNodeDataType

if TYPE_CHECKING:
    from sand.app import App


class AppSerde:
    def __init__(self, app: App):
        self.app = app

        self.kgns = app.kgns
        self.ontclass_ar = app.ontclass_ar
        self.ontprop_ar = app.ontprop_ar

    @staticmethod
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

    @staticmethod
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

    @staticmethod
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

    def serialize_graph(
        self,
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
                        if (tmp := self.ontclass_ar.get_by_uri(n.abs_uri)) is not None
                        else n.rel_uri,
                        "approximation": n.approximation,
                        "type": "class_node",
                    }
                )
            elif isinstance(n, O.DataNode):
                nodes.append(
                    {
                        "id": str(n.id),
                        "label": columns[n.col_index]
                        if columns is not None
                        else n.label,
                        "type": "data_node",
                        "column_index": n.col_index,
                    }
                )
            else:
                if n.datatype == O.LiteralNodeDataType.Entity:
                    value = {
                        "id": self.kgns.uri_to_id(n.value),
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
                    if (tmp := self.ontprop_ar.get_by_uri(e.abs_uri)) is not None
                    else e.rel_uri
                ),
                "approximation": e.approximation,
            }
            for e in sm.iter_edges()
        ]

        return dict(nodes=nodes, edges=edges)

    def batch_serialize_sms(self, sms: List[SemanticModel]):
        output = []
        for sm in sms:
            r = model_to_dict(sm, recurse=False)
            if r["data"] is not None:
                # columns = None if sm.table_id is None else tbls[sm.table_id].columns
                columns = None
                r["data"] = self.serialize_graph(r["data"], columns)  # type: ignore
            output.append(r)
        return output

    def deserialize_graph(self, value: dict) -> O.SemanticModel:
        if not isinstance(value, dict):
            raise ValueError(f"expect dictionary but get {type(value)}")
        if "nodes" not in value:
            raise ValueError("missing `nodes`")
        if "edges" not in value:
            raise ValueError("missing `edges`")
        if not isinstance(value["nodes"], list):
            raise ValueError(
                f"expect `nodes` to be a list but get {type(value['nodes'])}"
            )
        if not isinstance(value["edges"], list):
            raise ValueError(
                f"expect `edges` to be a list but get {type(value['edges'])}"
            )

        sm = O.SemanticModel()
        kgns = self.kgns
        idmap = {}

        for node in value["nodes"]:
            if not isinstance(node, dict):
                raise ValueError(f"expect node to be a dictionary but get {type(node)}")
            for k in ["id", "type"]:
                if k not in node:
                    raise ValueError(f"missing `{k}` in node")
                if not isinstance(node[k], (int, str)):
                    raise ValueError(
                        f"expect `{k}` to be a string or number but get {type(node[k])}"
                    )
            # if isinstance(node["id"], str):
            #     if not node["id"].isdigit():
            #         raise ValueError(
            #             f"expect `id` to be a string number but get {type(node['id'])}"
            #         )
            #     node["id"] = int(node["id"])
            # if not isinstance(node["id"], int):
            #     raise ValueError(f"expect `id` to be a number but get {type(node['id'])}")

            if node["type"] == "class_node":
                for k in ["uri", "label"]:
                    if k not in node:
                        raise ValueError(f"missing `{k}` in class_node")
                    if not isinstance(node[k], str):
                        raise ValueError(
                            f"expect `{k}` to be a string but get {type(node[k])}"
                        )
                if "approximation" not in node:
                    raise ValueError(f"missing `approximation` in class_node")
                if not isinstance(node["approximation"], bool):
                    raise ValueError(
                        f"expect `approximation` to be a boolean but get {type(node['approximation'])}"
                    )

                n = O.ClassNode(
                    abs_uri=node["uri"],
                    rel_uri=kgns.get_rel_uri(node["uri"]),
                    approximation=node["approximation"],
                    readable_label=node["label"],
                )
            elif node["type"] == "data_node":
                for k in ["label"]:
                    if k not in node:
                        raise ValueError(f"missing `{k}` in data_node")
                    if not isinstance(node[k], str):
                        raise ValueError(
                            f"expect `{k}` to be a string but get {type(node[k])}"
                        )
                if "column_index" not in node:
                    raise ValueError(f"missing `column_index` in data_node")
                if not isinstance(node["column_index"], int):
                    raise ValueError(
                        f"expect `column_index` to be an integer but get {type(node['column_index'])}"
                    )

                n = O.DataNode(
                    # id=node["id"],
                    col_index=node["column_index"],
                    label=node["label"],
                )
            elif node["type"] == "literal_node":
                for k in ["label"]:
                    if k not in node:
                        raise ValueError(f"missing `{k}` in literal_node")
                    if not isinstance(node[k], str):
                        raise ValueError(
                            f"expect `{k}` to be a string but get {type(node[k])}"
                        )
                if "is_in_context" not in node:
                    raise ValueError(f"missing `is_in_context` in literal_node")
                if not isinstance(node["is_in_context"], bool):
                    raise ValueError(
                        f"expect `is_in_context` to be a boolean but get {type(node['is_in_context'])}"
                    )

                if "value" not in node:
                    raise ValueError(f"missing `value` in literal_node")
                if not isinstance(node["value"], dict):
                    raise ValueError(
                        f"expect `value` to be a dictionary but get {type(node['value'])}"
                    )
                if "type" not in node["value"]:
                    raise ValueError(f"missing `type` in literal_node")
                if not isinstance(node["value"]["type"], str):
                    raise ValueError(
                        f"expect `type` to be a string but get {type(node['value']['type'])}"
                    )
                datatype = LiteralNodeDataType(node["value"]["type"])

                if datatype == LiteralNodeDataType.String:
                    if "value" not in node["value"]:
                        raise ValueError(f"missing `value` in literal_node")
                    if not isinstance(node["value"]["value"], str):
                        raise ValueError(
                            f"expect `value` to be a string but get {type(node['value']['value'])}"
                        )
                    node_value = node["value"]["value"]
                elif datatype == LiteralNodeDataType.Entity:
                    if "uri" not in node["value"]:
                        raise ValueError(f"missing `uri` in literal_node")
                    if not isinstance(node["value"]["uri"], str):
                        raise ValueError(
                            f"expect `uri` to be a string but get {type(node['value']['uri'])}"
                        )
                    node_value = node["value"]["uri"]
                else:
                    raise ValueError(f"unknown datatype {node['value']['type']}")

                n = O.LiteralNode(
                    # id=node["id"],
                    value=node_value,
                    is_in_context=node["is_in_context"],
                    readable_label=node["label"],
                    datatype=datatype,
                )
            else:
                raise ValueError(f"unknown node type {node['type']}")

            idmap[node["id"]] = sm.add_node(n)

        for edge in value["edges"]:
            if not isinstance(edge, dict):
                raise ValueError(f"expect edge to be a dictionary but get {type(edge)}")

            for k in ["uri", "label"]:
                if k not in edge:
                    raise ValueError(f"missing `{k}` in edge")
                if not isinstance(edge[k], str):
                    raise ValueError(
                        f"expect `{k}` to be a string but get {type(edge[k])}"
                    )

            for k in ["source", "target"]:
                if k not in edge:
                    raise ValueError(f"missing `{k}` in edge")
                if not isinstance(edge[k], (str, int)):
                    raise ValueError(
                        f"expect `{k}` to be string or number but get {type(edge[k])}"
                    )
                if edge[k] not in idmap:
                    raise KeyError(f"expect edge's {k} to exist")
                # if isinstance(edge[k], str):
                #     if not edge[k].isdigit():
                #         raise ValueError(
                #             f"expect `{k}` to be a string number but get {type(edge[k])}"
                #         )
                #     edge[k] = int(edge[k])
                # if not isinstance(edge[k], int):
                #     raise ValueError(f"expect `{k}` to be a number but get {type(edge[k])}")

            if "approximation" not in edge:
                raise ValueError(f"missing `approximation` in edge")
            if not isinstance(edge["approximation"], bool):
                raise ValueError(
                    f"expect `approximation` to be a boolean but get {type(edge['approximation'])}"
                )

            e = O.Edge(
                source=idmap[edge["source"]],
                target=idmap[edge["target"]],
                abs_uri=edge["uri"],
                rel_uri=kgns.get_rel_uri(edge["uri"]),
                approximation=edge["approximation"],
                readable_label=edge["label"],
            )
            if not (sm.has_node(e.source) and sm.has_node(e.target)):
                raise ValueError(f"edge {str(edge)} connects to unknown nodes")
            sm.add_edge(e)
        return sm
