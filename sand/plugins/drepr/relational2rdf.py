from dataclasses import dataclass
from io import StringIO
import orjson, csv
from typing import Dict, List, Set, Tuple, cast
from sand.config import SETTINGS
from sand.models.entity import NIL_ENTITY, Entity
from sand.models.ontology import OntProperty, OntPropertyAR, OntPropertyDataType
from sand.models.table import Table, TableRow
import sm.outputs.semantic_model as O
import sm.misc as M
from hugedict.chained_mapping import ChainedMapping
from drepr.models import (
    DRepr,
    Attr,
    Resource,
    ResourceType,
    CSVProp,
    Path,
    IndexExpr,
    RangeExpr,
    RangeAlignment,
    ValueAlignment,
    AlignmentType,
    AlignedStep,
    Preprocessing,
    PreprocessingType,
    PMap,
    ResourceDataString,
)
import drepr.models.sm as drepr_sm
from drepr.engine import execute, FileOutput, OutputFormat, MemoryOutput
from uuid import uuid4
from slugify import slugify
from sand.plugins.drepr.resources import get_entity_resource, get_table_resource
from sand.plugins.drepr.semanticmodel import get_drepr_sm, get_entity_data_nodes
from sand.plugins.drepr.transformation import has_transformation, get_transformation


def create_dataset_model(table: Table, sm: O.SemanticModel) -> DRepr:
    """Create a D-REPR model of the dataset."""
    columns = [slugify(c).replace("-", "_") for c in table.columns]
    get_attr_id = lambda ci: f"{ci}__{columns[ci]}"
    get_ent_attr_id = lambda ci: f"{ci}__ent__{columns[ci]}"
    ent_dnodes = get_entity_data_nodes(sm)

    attrs = [
        Attr(
            id=get_attr_id(ci),
            resource_id="table",
            path=Path(
                steps=[
                    RangeExpr(start=1, end=table.size + 1, step=1),
                    IndexExpr(val=ci),
                ]
            ),
            missing_values=[""],
        )
        for ci in range(len(table.columns))
    ]
    attrs += [
        Attr(
            id=get_ent_attr_id(node.col_index),
            resource_id="entity",
            path=Path(
                steps=[
                    RangeExpr(start=1, end=table.size + 1, step=1),
                    IndexExpr(val=node.col_index),
                ]
            ),
            missing_values=[""],
        )
        for node in ent_dnodes
    ]

    id2props = ChainedMapping(
        OntPropertyAR(),
        M.import_attr(SETTINGS["ont_props"]["default"]),
    )
    dsm = get_drepr_sm(sm, id2props, get_attr_id, get_ent_attr_id)

    datatype_transformations = []
    for node in sm.nodes():
        if not isinstance(node, O.DataNode):
            continue

        datatypes: Set[OntPropertyDataType] = {
            id2props[OntProperty.uri2id(inedge.abs_uri)].datatype
            for inedge in sm.in_edges(node.id)
        }
        datatype = list(datatypes)[0] if len(datatypes) == 1 else None
        if datatype is None or not has_transformation(datatype):
            continue
        datatype_transformations.append(
            Preprocessing(
                type=PreprocessingType.pmap,
                value=PMap(
                    resource_id="table",
                    path=Path(
                        steps=[
                            RangeExpr(start=1, end=table.size + 1, step=1),
                            IndexExpr(val=node.col_index),
                        ]
                    ),
                    code=get_transformation(datatype),
                    change_structure=False,
                ),
            )
        )

    return DRepr(
        resources=[
            Resource(id="table", type=ResourceType.CSV, prop=CSVProp()),
            Resource(id="entity", type=ResourceType.CSV, prop=CSVProp()),
        ],
        preprocessing=datatype_transformations,
        attrs=attrs,
        aligns=[
            RangeAlignment(
                source=get_attr_id(0),
                target=get_attr_id(ci),
                aligned_steps=[AlignedStep(source_idx=0, target_idx=0)],
            )
            for ci in range(1, len(table.columns))
        ]
        + [
            RangeAlignment(
                source=get_attr_id(0),
                target=get_ent_attr_id(node.col_index),
                aligned_steps=[AlignedStep(source_idx=0, target_idx=0)],
            )
            for node in ent_dnodes
        ],
        sm=dsm,
    )


def relational2rdf(table: Table, rows: List[TableRow], sm: O.SemanticModel):
    """Convert a relational table into RDF format"""
    if len(table.columns) == 0:
        # no column, no data
        return ""

    ent_columns = {node.col_index for node in get_entity_data_nodes(sm)}
    resources = {
        "table": get_table_resource(table, rows),
        "entity": get_entity_resource(table, rows, ent_columns),
    }

    content = execute(
        ds_model=create_dataset_model(table, sm),
        resources=resources,
        output=MemoryOutput(OutputFormat.TTL),
        debug=False,
    )
    return content
