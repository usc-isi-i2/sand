import logging
from functools import partial
from typing import Dict, List

from playhouse.shortcuts import model_to_dict
from sm.prelude import O
from smc.models.entity import EntityAR, Entity
from smc.models.ontology import OntPropertyAR, OntClassAR, OntProperty, OntClass
from smc.models.semantic_model import SemanticModel
from smc.models.table import Table
from smc.restful import generate_peewee_restful_api


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


def get_label(
    uri: str,
    is_entity: bool,
    is_class: bool,
    entities: Dict[str, Entity],
    ontprops: Dict[str, OntProperty],
    ontclasses: Dict[str, OntClass],
) -> None:
    if is_entity:
        if uri in entities:
            return entities[uri].readable_label
        elif uri in ontclasses:
            return ontclasses[uri].readable_label
        elif uri in ontprops:
            return ontprops[uri].readable_label
    elif is_class:
        if uri in ontclasses:
            return ontclasses[uri].readable_label
        elif uri in ontprops:
            return ontprops[uri].readable_label
        elif uri in entities:
            return entities[uri].readable_label
    else:
        if uri in ontprops:
            return ontprops[uri].readable_label
        elif uri in ontclasses:
            return ontclasses[uri].readable_label
        elif uri in entities:
            return entities[uri].readable_label
    return None


sm_bp = generate_peewee_restful_api(
    SemanticModel, serialize=serialize_sm, batch_serialize=batch_serialize_sms
)
