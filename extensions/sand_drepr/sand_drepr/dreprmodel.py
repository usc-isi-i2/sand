from __future__ import annotations

from collections import defaultdict
from io import BytesIO, StringIO
from typing import List, Mapping, Set

import orjson
import sm.outputs.semantic_model as O
from dependency_injector.wiring import Provide, inject
from drepr.models.prelude import (
    AlignedStep,
    Attr,
    CSVProp,
    DRepr,
    IndexExpr,
    Path,
    PMap,
    Preprocessing,
    PreprocessingType,
    RangeAlignment,
    RangeExpr,
    Resource,
    ResourceType,
)
from kgdata.misc.resource import RDFResource
from rdflib import RDF, Graph, URIRef
from sand_drepr.resources import get_entity_resource, get_table_resource
from sand_drepr.semanticmodel import get_drepr_sm, get_entity_data_nodes
from sand_drepr.transformation import get_transformation, has_transformation
from slugify import slugify
from sm.misc.funcs import assert_not_null
from sm.namespaces.prelude import KnowledgeGraphNamespace

from sand.config import AppConfig
from sand.extension_interface.export import IExport
from sand.helpers.namespace import NamespaceService
from sand.models.ontology import OntProperty, OntPropertyAR, OntPropertyDataType
from sand.models.table import Table, TableRow


def get_drepr_model(
    table_columns: list[str],
    table_size: int,
    sm: O.SemanticModel,
    kgns: NamespaceService,
    kgns_prefixes: dict[str, str],
    ontprop_ar: Mapping[str, OntProperty],
    ident_props: set[str],
) -> DRepr:
    """Create a D-REPR model of the dataset.

    Args:
        table_columns: list of column names
        table_size: number of rows in the table (exclude header)
        sm: the semantic model we want to convert
        ns: the graph namespace
        kgns_prefixes: the prefixes of the knowledge graph namespace
        ontprop_ar: mapping from the id to ontology property
        ident_props: list of properties that telling a data node contains entities (e.g., rdfs:label)
    """
    columns = [slugify(c).replace("-", "_") for c in table_columns]
    get_attr_id = lambda ci: f"{ci}__{columns[ci]}"
    get_ent_attr_id = lambda ci: f"{ci}__ent__{columns[ci]}"
    ent_dnodes = get_entity_data_nodes(sm, ident_props)

    attrs = [
        Attr(
            id=get_attr_id(ci),
            resource_id="table",
            path=Path(
                steps=[
                    RangeExpr(start=1, end=table_size + 1, step=1),
                    IndexExpr(val=ci),
                ]
            ),
            missing_values=[""],
        )
        for ci in range(len(table_columns))
    ]
    attrs += [
        Attr(
            id=get_ent_attr_id(node.col_index),
            resource_id="entity",
            path=Path(
                steps=[
                    RangeExpr(start=1, end=table_size + 1, step=1),
                    IndexExpr(val=node.col_index),
                ]
            ),
            missing_values=[""],
        )
        for node in ent_dnodes
    ]

    dsm = get_drepr_sm(
        sm=sm,
        kgns=kgns,
        kgns_prefixes=kgns_prefixes,
        ontprop_ar=ontprop_ar,
        ident_props=ident_props,
        get_attr_id=get_attr_id,
        get_ent_attr_id=get_ent_attr_id,
    )

    datatype_transformations = []
    for node in sm.nodes():
        if not isinstance(node, O.DataNode):
            continue

        datatypes: Set[OntPropertyDataType] = {
            assert_not_null(ontprop_ar[kgns.uri_to_id(inedge.abs_uri)]).datatype
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
                            RangeExpr(start=1, end=table_size + 1, step=1),
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
            for ci in range(1, len(table_columns))
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
