from dataclasses import dataclass
from io import StringIO
import orjson, csv
from typing import Callable, Dict, List, Mapping, Set, Tuple
from sand.config import SETTINGS
from sand.models.entity import NIL_ENTITY, Entity
from sand.models.ontology import OntProperty, OntPropertyAR, OntPropertyDataType
from sand.models.table import Table, TableRow
import sm.outputs.semantic_model as O
import sm.misc as M
from sm.namespaces.wikidata import WikidataNamespace
import drepr.models.sm as drepr_sm


prefixes = WikidataNamespace.create().prefix2ns.copy()
prefixes.update(drepr_sm.SemanticModel.get_default_prefixes())


# mapping from predefined datatypes to D-REPR datatype
datatype_mapping: Mapping[OntPropertyDataType, drepr_sm.DataType] = {
    "globe-coordinate": drepr_sm.DataType.geo_wktLiteral,
    "url": drepr_sm.DataType.xsd_anyURI,
    "external-id": drepr_sm.DataType.xsd_anyURI,
    "string": drepr_sm.DataType.xsd_string,
    "quantity": None,
    "time": drepr_sm.DataType.xsd_dateTime,
}


def get_drepr_sm(
    sm: O.SemanticModel,
    id2props: Mapping[str, OntProperty],
    get_attr_id: Callable[[int], str],
    get_ent_attr_id: Callable[[int], str],
) -> drepr_sm.SemanticModel:
    """Convert sm model into drepr model.

    Args:
        sm: the semantic model we want to convert
        id2props: mapping from the id to ontology property
        get_attr_id: get attribute id from column index
        get_ent_attr_id: for each entity column, to generate url, we create an extra attribute containing the entity uri, this function get its id based on the column index
    """
    nodes = {}
    edges = {}

    for node in sm.nodes():
        if isinstance(node, O.ClassNode):
            nodes[str(node.id)] = drepr_sm.ClassNode(
                node_id=str(node.id), label=node.rel_uri
            )
        elif isinstance(node, O.DataNode):
            # find data type of this node, when they have multiple data types
            # that do not agree with each other, we don't set the datatype
            # usually, that will be displayed from the UI so users know that

            datatypes: Set[OntPropertyDataType] = {
                id2props[OntProperty.uri2id(inedge.abs_uri)].datatype
                for inedge in sm.in_edges(node.id)
            }
            datatype = (
                datatype_mapping.get(list(datatypes)[0], None)
                if len(datatypes) == 1
                else None
            )

            nodes[str(node.id)] = drepr_sm.DataNode(
                node_id=str(node.id),
                attr_id=get_attr_id(node.col_index),
                data_type=datatype,
            )
        elif isinstance(node, O.LiteralNode):
            if node.datatype == O.LiteralNodeDataType.Entity:
                datatype = drepr_sm.DataType.xsd_anyURI
            else:
                assert node.datatype == O.LiteralNodeDataType.String
                datatype = drepr_sm.DataType.xsd_string

            nodes[str(node.id)] = drepr_sm.LiteralNode(
                node_id=str(node.id), value=node.value, data_type=datatype
            )

    used_ids = {x for edge in sm.edges() for x in [str(edge.source), str(edge.target)]}
    for node_id in set(nodes.keys()).difference(used_ids):
        del nodes[node_id]

    for edge in sm.edges():
        edges[len(edges)] = drepr_sm.Edge(
            edge_id=len(edges),
            source_id=str(edge.source),
            target_id=str(edge.target),
            label=edge.rel_uri,
        )

    # add drepr:uri relationship
    for node in get_entity_data_nodes(sm):
        new_node_id = str(node.id) + ":ents"
        nodes[new_node_id] = drepr_sm.DataNode(
            node_id=new_node_id,
            attr_id=get_ent_attr_id(node.col_index),
            data_type=drepr_sm.DataType.xsd_anyURI,
        )
        inedges = [
            inedge
            for inedge in sm.in_edges(node.id)
            if inedge.abs_uri in SETTINGS["semantic_model"]["identifiers"]
        ]
        assert len(inedges) == 1
        inedge = inedges[0]
        edges[len(edges)] = drepr_sm.Edge(
            edge_id=len(edges),
            source_id=str(inedge.source),
            target_id=new_node_id,
            # special predicate telling drepr to use as uri of entity, instead of generating a blank node
            label="drepr:uri",
        )

    return drepr_sm.SemanticModel(
        nodes=nodes,
        edges=edges,
        prefixes=prefixes,
    )


def get_entity_data_nodes(sm: O.SemanticModel) -> List[O.DataNode]:
    ident_props = SETTINGS["semantic_model"]["identifiers"]
    ent_dnodes = []
    for node in sm.iter_nodes():
        if not isinstance(node, O.DataNode):
            continue

        stypes = sm.get_semantic_types_of_column(node.col_index)
        if any(stype.predicate_abs_uri in ident_props for stype in stypes):
            ent_dnodes.append(node)

    return ent_dnodes
