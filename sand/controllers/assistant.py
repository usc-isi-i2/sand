from abc import ABC, abstractmethod
from dataclasses import dataclass
import threading
from typing import Dict, List, Optional, Tuple
from flask.blueprints import Blueprint
from gena.deserializer import (
    generate_deserializer,
    get_dataclass_deserializer,
)
from grams.algorithm.inferences.features.tree_utils import TreeStruct
from sm.misc.funcs import import_func
from sm.outputs.semantic_model import SemanticModel
from sand.config import SETTINGS
from functools import partial
from sand.models.table import Link, Table, TableRow
from flask import request, jsonify
from sand.serializer import batch_serialize_sms, get_label, serialize_graph
from sand.models.entity import NIL_ENTITY, Entity, EntityAR
from sand.models.ontology import OntProperty, OntClass, OntPropertyAR, OntClassAR
from operator import attrgetter

from peewee import Model as PeeweeModel, DoesNotExist, fn

from werkzeug.exceptions import BadRequest, NotFound


class Assistant(ABC):
    @abstractmethod
    def predict(
        self, table: Table, rows: List[TableRow]
    ) -> Tuple[Optional[SemanticModel], Optional[List[TableRow]]]:
        """Predict semantic model and link entities"""
        pass


assistant_bp = Blueprint("assistant", "assistant")


GetAssistantCache = threading.local()


def get_assistants() -> Dict[str, Assistant]:
    """Get all assistants"""
    global GetAssistantCache

    if not hasattr(GetAssistantCache, "assistants"):
        GetAssistantCache.assistants = {}
        for name, constructor in SETTINGS["assistants"].items():
            GetAssistantCache.assistants[name] = import_func(constructor)()

    return GetAssistantCache.assistants


@assistant_bp.route(f"/{assistant_bp.name}/predict/<table_id>", methods=["GET"])
def predict(table_id: int):

    table = Table.get_by_id(table_id)
    rows: List[TableRow] = list(
        TableRow.select().where(TableRow.table == table).order_by(TableRow.index)
    )

    assistants = get_assistants()
    selected_assistants = {
        name: assistants[name]
        for name in request.args.get("algorithm", "").split(",")
        if name in assistants
    }
    if len(selected_assistants) == 0:
        selected_assistants = assistants

    ontprops = OntPropertyAR()
    ontclasses = OntClassAR()
    uri2lbl = partial(get_label, ontprops=ontprops, ontclasses=ontclasses)

    outputs = {}
    for name, assistant in selected_assistants.items():
        sm, outputrows = assistant.predict(table, rows)
        if sm is not None:
            sm = serialize_graph(sm, uri2lbl, columns=None)
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


@dataclass
class GatherColumnTypesInput:
    table: int
    column: int


deser_gather_column_types = get_dataclass_deserializer(GatherColumnTypesInput, {})
assert deser_gather_column_types is not None


@assistant_bp.route(f"/{assistant_bp.name}/column-types", methods=["POST"])
def gather_column_types():
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
    entities = EntityAR()
    ont_classes = OntClassAR()

    for row in rows:
        for link in row.links.get(column, []):
            if (
                link.entity_id is not None
                and link.entity_id != NIL_ENTITY
                and link.entity_id not in ents
            ):
                ents[link.entity_id] = entities.get(link.entity_id, None)
            for can_ent in link.candidate_entities:
                ents[can_ent.entity_id] = entities.get(can_ent.entity_id, None)

    classes: Dict[str, OntClass] = {}
    for ent in ents.values():
        if ent is None:
            continue
        for stmt in ent.properties.get(ent.instanceof, []):
            if stmt.value.is_entity_id():
                klass_id = stmt.value.value
                assert isinstance(klass_id, str)
                klass = ont_classes.get(klass_id, None)
                if klass is not None:
                    classes[klass_id] = klass

    tree = TreeStruct.construct(classes, get_parents=lambda id: classes[id].parents)
    return jsonify({p: list(cs) for p, cs in tree.p2cs.items()})
