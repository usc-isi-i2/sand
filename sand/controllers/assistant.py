from __future__ import annotations

import threading
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, List, Literal, Optional

from flask import jsonify, request
from flask.blueprints import Blueprint
from gena.deserializer import get_dataclass_deserializer
from peewee import DoesNotExist
from sand.controllers.base import BaseController
from sand.extension_interface.assistant import IAssistant
from sand.helpers.tree_utils import TreeStruct
from sand.models.entity import Entity
from sand.models.ontology import OntClass
from sand.models.table import Link, Table, TableRow
from sm.misc.funcs import import_func
from werkzeug.exceptions import BadRequest, NotFound


@dataclass
class GatherColumnTypesInput:
    table: int
    column: int


deser_gather_column_types = get_dataclass_deserializer(GatherColumnTypesInput, {})
assert deser_gather_column_types is not None


class AssistantController(BaseController):
    @lru_cache()
    def get_assistant(self, name: Literal["default"] | str) -> IAssistant:
        """Get all assistants"""
        return import_func(self.app_cfg.assistant.get_func(name))()

    def get_blueprint(self):
        bp = Blueprint("assistant", "assistant")
        bp.add_url_rule(
            f"/{bp.name}/predict/<table_id>",
            endpoint="assistant---predict_semantic_desc",
            methods=["GET"],
            view_func=self.predict_semantic_desc,
        )
        bp.add_url_rule(
            f"{bp.name}/column-types",
            endpoint="assistant---gather_column_types",
            methods=["POST"],
        )
        return bp

    def predict_semantic_desc(self, table_id: int):
        table = Table.get_by_id(table_id)
        rows: List[TableRow] = list(
            TableRow.select().where(TableRow.table == table).order_by(TableRow.index)
        )

        selected_assistants = {
            name: self.get_assistant(name)
            for name in request.args.get("algorithm", "").split(",")
            if name in self.app_cfg.assistant.funcs
        }
        if len(selected_assistants) == 0:
            selected_assistants = {
                self.app_cfg.assistant.default: self.get_assistant("default")
            }

        outputs = {}
        for name, assistant in selected_assistants.items():
            sm, outputrows = assistant.predict(table, rows)
            if sm is not None:
                sm = self.app.serde.serialize_graph(sm, columns=None)
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

    def gather_column_types(self):
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

        nil_entity_id = self.app_cfg.entity.nil.id
        for row in rows:
            for link in row.links.get(column, []):
                if (
                    link.entity_id is not None
                    and link.entity_id != nil_entity_id
                    and link.entity_id not in ents
                ):
                    ents[link.entity_id] = self.entity_ar.get(link.entity_id, None)
                for can_ent in link.candidate_entities:
                    ents[can_ent.entity_id] = self.entity_ar.get(
                        can_ent.entity_id, None
                    )

        classes: Dict[str, OntClass] = {}
        for ent in ents.values():
            if ent is None:
                continue
            for stmt in ent.properties.get(ent.instanceof, []):
                if stmt.value.is_entity_id():
                    klass_id = stmt.value.value
                    assert isinstance(klass_id, str)
                    klass = self.ontclass_ar.get(klass_id, None)
                    if klass is not None:
                        classes[klass_id] = klass

        tree = TreeStruct.construct(classes, get_parents=lambda id: classes[id].parents)
        return jsonify({p: list(cs) for p, cs in tree.p2cs.items()})
