from functools import partial
import os
from typing import List

from flask_peewee_restful import generate_readonly_api_4dict, generate_api
from flask_peewee_restful import generate_app
from flask_peewee_restful.deserializer import deserialize_dict, generate_deserializer
from grams.inputs.context import Attribute
from hugedict.chained_mapping import ChainedMapping
from smc.deserializer import deserialize_graph
from smc.models import SemanticModel, EntityAR, Project, Table, TableRow
from smc.models.ontology import OntClass, OntClassAR, OntProperty, OntPropertyAR
from smc.serializer import (
    get_label,
    serialize_class,
    serialize_entity,
    batch_serialize_sms,
    serialize_property,
)
import sm.outputs as O
from smc.plugins.wikidata import DEFAULT_ONT_CLASSES, DEFAULT_ONT_PROPS
from flask import json, jsonify, request
from peewee import Model as PeeweeModel, DoesNotExist, fn

table_bp = generate_api(
    Table,
    deserializers=generate_deserializer(Table, {Attribute: deserialize_dict}),
)


@table_bp.route(f"/{table_bp.name}/<id>/export", methods=["GET"])
def export(id: int):
    subquery = (
        SemanticModel.select(
            SemanticModel.id, fn.MAX(SemanticModel.version).alias("version")
        )
        .where(SemanticModel.table == id)
        .group_by(SemanticModel.table, SemanticModel.name)
        .alias("q1")
    )

    query = (
        SemanticModel.select()
        .where(SemanticModel.table == id)
        .join(subquery, on=(SemanticModel.id == subquery.c.id))
    )

    sms: List[O.SemanticModel] = [r.data for r in query]
    ontprops = OntPropertyAR()
    ontclasses = OntClassAR()
    uri2lbl = partial(get_label, ontprops=ontprops, ontclasses=ontclasses)

    for sm in sms:
        for n in sm.iter_nodes():
            if isinstance(n, O.ClassNode):
                if n.readable_label is None:
                    n.readable_label = uri2lbl(n.abs_uri, is_class=True) or n.rel_uri
        for e in sm.iter_edges():
            if e.readable_label is None:
                e.readable_label = uri2lbl(e.abs_uri, is_class=False) or e.rel_uri

    resp = jsonify([sm.to_dict() for sm in sms])
    if request.args.get("attachment", "false") == "true":
        resp.headers["Content-Disposition"] = "attachment; filename=export.json"
    return resp
