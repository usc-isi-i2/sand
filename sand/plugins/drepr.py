from dataclasses import dataclass
import json
from typing import Dict, List, Set, Tuple
from sand.config import SETTINGS
from sand.models.entity import NIL_ENTITY, Entity
from sand.models.ontology import OntProperty, OntPropertyAR
from sand.models.table import Table, TableRow
import sm.outputs as O
import sm.misc as M
from drepr.models.drepr import DRepr, Attr
from drepr.models.resource import Resource, ResourceType, CSVProp
from drepr.models.path import Path, IndexExpr, RangeExpr
from drepr.models.align import (
    RangeAlignment,
    ValueAlignment,
    AlignmentType,
    AlignedStep,
)
from drepr.models.preprocessing import Preprocessing, PreprocessingType, PMap
import drepr.models.sm as drepr_sm
from drepr.engine import execute, FileOutput, OutputFormat, MemoryOutput
from uuid import uuid4


def export_csv_data(table: Table, rows: List[TableRow], sm: O.SemanticModel) -> str:
    # write data into a file
    if len(table.columns) == 0:
        # no column, no data
        return ""

    # extract entity columns
    ident_props = SETTINGS["semantic_model"]["identifiers"]
    ent_columns = []
    for ci in range(len(table.columns)):
        if not sm.has_data_node(ci):
            continue
        stypes = sm.get_semantic_types_of_column(ci)
        if any(stype.predicate_abs_uri in ident_props for stype in stypes):
            ent_columns.append(ci)

    M.serialize_csv([table.columns] + [row.row for row in rows], "/tmp/test.data.csv")
    M.serialize_json(
        {f"column-{ci}-ents": extract_row_ent(rows, ci) for ci in ent_columns},
        "/tmp/test.entity.json",
    )

    uri2datatype, transformations = extract_datatype_and_transformation(sm)

    # define resources and drepr model
    resources = {"data": "/tmp/test.data.csv", "entity": "/tmp/test.entity.json"}

    ds_model = DRepr(
        resources=[
            Resource(id="data", type=ResourceType.CSV, prop=CSVProp()),
            Resource(id="entity", type=ResourceType.JSON, prop=None),
        ],
        preprocessing=[
            Preprocessing(
                type=PreprocessingType.pmap,
                value=PMap(
                    resource_id="data",
                    path=Path(
                        steps=[
                            RangeExpr(start=1, end=table.size + 1, step=1),
                            IndexExpr(val=ci),
                        ]
                    ),
                    code=code,
                    change_structure=False,
                ),
            )
            for ci, code in transformations.items()
        ],
        attrs=[
            Attr(
                id=f"column-{ci}",
                resource_id="data",
                path=Path(
                    steps=[
                        RangeExpr(start=1, end=table.size + 1, step=1),
                        IndexExpr(val=ci),
                    ]
                ),
                missing_values=[""],
            )
            for ci, column in enumerate(table.columns)
        ]
        + [
            Attr(
                id=f"column-{ci}-ents",
                resource_id="entity",
                path=Path(
                    steps=[
                        IndexExpr(val=f"column-{ci}-ents"),
                        RangeExpr(start=0, end=table.size, step=1),
                    ]
                ),
                missing_values=[""],
            )
            for ci in ent_columns
        ],
        aligns=[
            RangeAlignment(
                source=f"column-{0}",
                target=f"column-{ci}",
                aligned_steps=[AlignedStep(source_idx=0, target_idx=0)],
            )
            for ci in range(1, len(table.columns))
        ]
        + [
            RangeAlignment(
                source=f"column-{0}",
                target=f"column-{ci}-ents",
                aligned_steps=[AlignedStep(source_idx=0, target_idx=1)],
            )
            for ci in ent_columns
        ],
        sm=to_drepr_sm(sm, ent_columns, uri2datatype),
    )

    with open("/tmp/test.model.yml", "w") as f:
        f.write(ds_model.to_lang_yml(simplify=True))

    content = execute(
        ds_model=ds_model,
        resources=resources,
        output=MemoryOutput(OutputFormat.TTL),
        debug=True,
    )["value"]
    return content


def to_drepr_sm(
    sm: O.SemanticModel, ent_columns: List[int], uri2datatype: Dict[str, str]
) -> drepr_sm.SemanticModel:
    """Convert sm model into drepr model"""
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
            datatypes = {
                uri2datatype[inedge.abs_uri]
                for inedge in sm.in_edges(node.id)
                if inedge.abs_uri in uri2datatype
            }
            datatype = list(datatypes)[0] if len(datatypes) == 1 else None

            nodes[str(node.id)] = drepr_sm.DataNode(
                node_id=str(node.id),
                attr_id=f"column-{node.col_index}",
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
    for ci in ent_columns:
        node = sm.get_data_node(ci)
        new_node_id = str(node.id) + ":ents"
        nodes[new_node_id] = drepr_sm.DataNode(
            node_id=new_node_id,
            attr_id=f"column-{node.col_index}-ents",
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
        prefixes=dict(
            wd="http://www.wikidata.org/entity/",
            p="http://www.wikidata.org/prop/",
            **drepr_sm.SemanticModel.get_default_prefixes(),
        ),
    )


def extract_row_ent(rows: List[TableRow], column_index: int) -> List[str]:
    # TODO: how to know if same text refers to the same entity?
    # for now, assume it is
    maps = {}
    ents = []
    new_entity_template: str = SETTINGS["entity"]["new_entity_template"]

    for row in rows:
        cell = row.row[column_index]
        if cell in maps:
            ents.append(maps[cell])
            continue

        links = row.links.get(str(column_index), [])
        # TODO: what happens when there are multiple entities?
        ent = None
        for link in links:
            if link.entity_id is not None and link.entity_id != NIL_ENTITY:
                ent = Entity.id2uri(link.entity_id)
                break
        else:
            # generate new entity
            ent = new_entity_template.format(id=str(uuid4()))

        ents.append(ent)
        maps[cell] = ent

    return ents


def extract_datatype_and_transformation(
    sm: O.SemanticModel,
) -> Tuple[Dict[str, str], Dict[int, str]]:
    """
    Extract datatype and transformation of each predicate in the model.

    Return a mapping from property uri to datatype and from column index to transformation
    """
    id2uri: Dict[str, str] = {}  # from uri to id
    for edge in sm.edges():
        id2uri[OntProperty.uri2id(edge.abs_uri)] = edge.abs_uri

    id2prop = OntPropertyAR()
    props = {pid: id2prop[pid] for pid in id2uri.keys() if pid in id2prop}

    datatype = {}
    transformations = {}

    def get_columns_with_type(abs_uri: str):
        lst = []
        for edge in sm.edges():
            if edge.abs_uri == abs_uri:
                node = sm.get_node(edge.target)
                if not isinstance(node, O.DataNode):
                    continue
                lst.append(node.col_index)
        return lst

    for pid, prop in props.items():
        # try to figure out the type
        if pid in {"P2660", "P2044"}:
            datatype[id2uri[pid]] = drepr_sm.DataType.xsd_decimal
        elif pid in {"P625"}:
            datatype[id2uri[pid]] = drepr_sm.DataType.geo_wktLiteral
            for col_idx in get_columns_with_type(id2uri[pid]):
                transformations[col_idx] = Transformation.geo_wkt_literal_transform()
        else:
            datatype[id2uri[pid]] = drepr_sm.DataType.xsd_string

    return datatype, transformations


class Transformation:
    @staticmethod
    def geo_wkt_literal_transform():
        return r"""
from lat_lon_parser import parse

try:
    part = {" ", ".", "°", "′", "″", "'", '"'}
    norm_value = value.lower().replace("b", "n").replace("đ", "e").replace("t", "w").upper()
    split_index = -1
    for i, c in enumerate(norm_value):
        if c.isdigit() or c in part:
            continue
        split_index = i + 1
        break
    
    if split_index == -1:
        return value
    
    part1, part2 = norm_value[:split_index], norm_value[split_index:]
    if "E" in part2 or "W" in part2:
        lat, long = part1, part2
    else:
        lat, long = part2, part1
    
    lat = parse(lat)
    long = parse(long)
    return f"Point({long} {lat})"
except:
    return value
        """.strip()
