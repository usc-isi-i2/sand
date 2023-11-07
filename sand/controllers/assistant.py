from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import sm.outputs.semantic_model as O
from dependency_injector.wiring import Provide, inject
from flask import jsonify, request
from flask.blueprints import Blueprint
from gena.deserializer import get_dataclass_deserializer
from peewee import DoesNotExist
from werkzeug.exceptions import BadRequest, NotFound

import sand.serializer as sand_ser
from sand.config import AppConfig
from sand.extension_interface.assistant import IAssistant
from sand.helpers.service_provider import MultiServiceProvider
from sand.helpers.tree_utils import TreeStruct
from sand.models.entity import Entity, EntityAR
from sand.models.ontology import OntClass, OntClassAR
from sand.models.table import Link, Table, TableRow


@dataclass
class GatherColumnTypesInput:
    table: int
    column: int


deser_gather_column_types = get_dataclass_deserializer(GatherColumnTypesInput, {})
assert deser_gather_column_types is not None

assistant_bp = Blueprint("assistant", "assistant")


@assistant_bp.route(
    f"/{assistant_bp.name}/predict/<table_id>",
    methods=["GET"],
)
@inject
def predict_semantic_desc(
    table_id: int,
    assistant_service: MultiServiceProvider[IAssistant] = Provide["assistant"],
    entity_ar: EntityAR = Provide["entities"],
    ontclass_ar: OntClassAR = Provide["classes"],
    ontprop_ar: OntClassAR = Provide["properties"],
):
    table = Table.get_by_id(table_id)
    rows: List[TableRow] = list(
        TableRow.select().where(TableRow.table == table).order_by(TableRow.index)
    )

    selected_assistants = {
        name: assistant_service.get(name)
        for name in request.args.get("algorithm", "").split(",")
        if name in assistant_service.get_available_providers()
    }
    if len(selected_assistants) == 0:
        selected_assistants = {"default": assistant_service.get_default()}

    outputs = {}
    for name, assistant in selected_assistants.items():
        sm, outputrows = assistant.predict(table, rows)
        if sm is not None:
            for node in sm.iter_nodes():
                if isinstance(node, O.ClassNode):
                    if node.readable_label is None:
                        tmpcls = ontclass_ar.get_by_uri(node.abs_uri)
                        if tmpcls is not None:
                            node.readable_label = tmpcls.readable_label
                        else:
                            node.readable_label = node.rel_uri
                elif isinstance(node, O.LiteralNode):
                    if (
                        node.readable_label is None
                        and node.datatype == O.LiteralNodeDataType.Entity
                    ):
                        tmpent = entity_ar.get_by_uri(node.value)
                        if tmpent is not None:
                            node.readable_label = tmpent.readable_label
                        else:
                            node.readable_label = node.value
            for edge in sm.iter_edges():
                if edge.readable_label is None:
                    tmpprop = ontprop_ar.get_by_uri(edge.abs_uri)
                    if tmpprop is not None:
                        edge.readable_label = tmpprop.readable_label
                    else:
                        edge.readable_label = edge.rel_uri

            sm = sand_ser.serialize_graph(sm, columns=None)
        if outputrows is not None:
            # preserved the manual entity linking from the users
            for outputrow, row in zip(outputrows, rows):
                assert outputrow.id == row.id
                for ci, links in outputrow.links.items():
                    if ci in row.links:
                        glinks: Dict[int, List[Link]] = {}
                        for link in row.links[ci]:
                            if link.entity_id is None:
                                continue
                            glinks.setdefault(link.start, []).append(link)
                        for link in links:
                            for glink in glinks.get(link.start, []):
                                if link.end == glink.end:
                                    link.entity_id = glink.entity_id
            outputrows = [row.to_dict() for row in outputrows]

        outputs[name] = {"sm": sm, "rows": outputrows}

    return jsonify(outputs)


@assistant_bp.route(
    f"{assistant_bp.name}/column-types",
    methods=["POST"],
)
@inject
def gather_column_types(
    appcfg: AppConfig = Provide["appcfg"],
    entity_ar: EntityAR = Provide["entities"],
    ontclass_ar: OntClassAR = Provide["classes"],
):
    """Gather types of the column via its entities"""
    request_json = request.get_json()
    if request_json is None:
        raise BadRequest("Missing request body")

    args: GatherColumnTypesInput = deser_gather_column_types(request_json)

    try:
        table: Table = Table.get_by_id(args.table)
    except DoesNotExist:
        raise NotFound(f"Record {id} does not exist")

    if args.column >= len(table.columns):
        raise BadRequest(f"Invalid column {args.column} value")

    rows: List[TableRow] = list(TableRow.select().where(TableRow.table == table))
    column = str(args.column)
    ents: Dict[str, Optional[Entity]] = {}

    nil_entity_id = appcfg.entity.nil.id
    for row in rows:
        for link in row.links.get(column, []):
            if (
                link.entity_id is not None
                and link.entity_id != nil_entity_id
                and link.entity_id not in ents
            ):
                ents[link.entity_id] = entity_ar.get(link.entity_id, None)
            for can_ent in link.candidate_entities:
                ents[can_ent.entity_id] = entity_ar.get(can_ent.entity_id, None)

    classes: Dict[str, OntClass] = {}
    for ent in ents.values():
        if ent is None:
            continue
        for stmt in ent.properties.get(ent.instanceof, []):
            if stmt.value.is_entity_id():
                klass_id = stmt.value.value
                assert isinstance(klass_id, str)
                klass = ontclass_ar.get(klass_id, None)
                if klass is not None:
                    classes[klass_id] = klass

    tree = TreeStruct.construct(classes, get_parents=lambda id: classes[id].parents)
    return jsonify({p: list(cs) for p, cs in tree.p2cs.items()})
