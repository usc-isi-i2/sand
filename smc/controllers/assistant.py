from abc import ABC, abstractmethod
import threading
from typing import Dict, List, Optional, Tuple
from flask.blueprints import Blueprint
from flask_peewee_restful.deserializer import generate_deserializer
from sm.misc.funcs import import_func
from sm.outputs.semantic_model import SemanticModel
from smc.config import ASSISTANTS
from functools import partial
from smc.models.table import Table, TableRow
from flask import request, jsonify
from smc.serializer import batch_serialize_sms, get_label, serialize_graph
from smc.models.entity import Entity, EntityAR
from smc.models.ontology import OntProperty, OntClass, OntPropertyAR, OntClassAR


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
        for name, constructor in ASSISTANTS.items():
            GetAssistantCache.assistants[name] = import_func(constructor)()

    return GetAssistantCache.assistants


@assistant_bp.route(f"/{assistant_bp.name}/predict/<table_id>", methods=["GET"])
def predict(table_id: int):

    table = Table.get_by_id(table_id)
    rows = list(
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
            outputrows = [row.to_dict() for row in outputrows]

        outputs[name] = {"sm": sm, "rows": outputrows}

    return jsonify(outputs)
