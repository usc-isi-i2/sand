from __future__ import annotations

from collections import defaultdict
from io import BytesIO, StringIO
from typing import List, Set

import orjson
import sm.outputs.semantic_model as O
from dependency_injector.wiring import Provide, inject
from drepr.engine import MemoryOutput, OutputFormat, ResourceDataString, execute
from drepr.models import (
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
from slugify import slugify
from sm.misc.funcs import assert_not_null

from sand.config import AppConfig
from sand.extension_interface.export import IExport
from sand.extensions.export.drepr.resources import (
    get_entity_resource,
    get_table_resource,
)
from sand.extensions.export.drepr.semanticmodel import (
    get_drepr_sm,
    get_entity_data_nodes,
)
from sand.extensions.export.drepr.transformation import (
    get_transformation,
    has_transformation,
)
from sand.helpers.namespace import NamespaceService
from sand.models.ontology import OntPropertyAR, OntPropertyDataType
from sand.models.table import Table, TableRow


class DreprExport(IExport):
    @inject
    def __init__(
        self,
        appcfg: AppConfig = Provide["appcfg"],
        namespace: NamespaceService = Provide["namespace"],
        ontprop_ar: OntPropertyAR = Provide["properties"],
    ):
        self.appcfg = appcfg
        self.namespace = namespace
        self.ontprop_ar = ontprop_ar

    def export_data_model(self, table: Table, sm: O.SemanticModel) -> dict[str, str]:
        model = self.export_drepr_model(table, sm)
        return {
            "model.json": orjson.dumps(
                model.serialize(), option=orjson.OPT_INDENT_2 | orjson.OPT_NON_STR_KEYS
            ).decode(),
            "model.yml": model.to_lang_yml(),
        }

    def export_extra_resources(
        self, table: Table, rows: list[TableRow], sm: O.SemanticModel
    ) -> dict[str, str]:
        if len(table.columns) == 0:
            # no column, no data
            return {}

        ent_columns = {
            node.col_index for node in get_entity_data_nodes(self.appcfg, sm)
        }
        entresource = get_entity_resource(
            self.appcfg, self.namespace, table, rows, ent_columns
        )
        assert isinstance(entresource, ResourceDataString)
        return {
            "entity": entresource.value.decode()
            if isinstance(entresource.value, bytes)
            else entresource.value
        }

    def export_data(
        self,
        table: Table,
        rows: List[TableRow],
        sm: O.SemanticModel,
        output_format: OutputFormat,
    ):
        """Convert a relational table into RDF format"""
        if len(table.columns) == 0:
            # no column, no data
            return ""

        ent_columns = {
            node.col_index for node in get_entity_data_nodes(self.appcfg, sm)
        }
        resources = {
            "table": get_table_resource(table, rows),
            "entity": get_entity_resource(
                self.appcfg, self.namespace, table, rows, ent_columns
            ),
        }

        content = execute(
            ds_model=self.export_drepr_model(table, sm),
            resources=resources,
            output=MemoryOutput(output_format),
            debug=False,
        )
        return self.post_processing(sm, content, output_format)

    def export_drepr_model(self, table: Table, sm: O.SemanticModel) -> DRepr:
        """Create a D-REPR model of the dataset."""
        columns = [slugify(c).replace("-", "_") for c in table.columns]
        get_attr_id = lambda ci: f"{ci}__{columns[ci]}"
        get_ent_attr_id = lambda ci: f"{ci}__ent__{columns[ci]}"
        ent_dnodes = get_entity_data_nodes(self.appcfg, sm)

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

        dsm = get_drepr_sm(
            self.appcfg,
            self.namespace,
            sm,
            self.ontprop_ar,
            get_attr_id,
            get_ent_attr_id,
        )

        datatype_transformations = []
        for node in sm.nodes():
            if not isinstance(node, O.DataNode):
                continue

            datatypes: Set[OntPropertyDataType] = {
                assert_not_null(self.ontprop_ar.get_by_uri(inedge.abs_uri)).datatype
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

    def post_processing(
        self, sm: O.SemanticModel, ttldata: str, output_format: OutputFormat
    ) -> str:
        """Post-processing the TTL data to fix until D-REPR addresses
        them.

        1. D-REPR doesn't generate relationships for literals that have outgoing edges to class nodes
        """
        outliterals = []
        for node in sm.iter_nodes():
            if isinstance(node, O.LiteralNode):
                if sm.out_degree(node.id) > 0:
                    outliterals.append(node)

        if len(outliterals) == 0:
            return ttldata

        assert output_format == OutputFormat.TTL, "Only support TTL output format"
        g = Graph()
        file = StringIO(ttldata)
        g.parse(file)

        source2triples = defaultdict(list)
        for s, p, o in g:
            source2triples[s].append((s, p, o))
        resources = [
            RDFResource.from_triples(k, ts) for k, ts in source2triples.items()
        ]

        new_triples = []
        for node in outliterals:
            node_value = URIRef(node.value)
            for edge in sm.out_edges(node.id):
                target_node = sm.get_node(edge.target)
                assert isinstance(target_node, O.ClassNode)
                for resource in resources:
                    if str(resource.props[str(RDF.type)][0]) == target_node.abs_uri:
                        new_triples.append(
                            (node_value, URIRef(edge.abs_uri), URIRef(resource.id))
                        )

        for triple in new_triples:
            g.add(triple)

        file = BytesIO()
        g.serialize(file, format="turtle")
        return file.getvalue().decode()
