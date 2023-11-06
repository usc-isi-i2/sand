from dataclasses import dataclass
from functools import lru_cache
from typing import List, Literal, Optional

import sm.outputs.semantic_model as O
from drepr.engine import OutputFormat
from flask import Blueprint, jsonify, make_response, request
from gena import generate_api
from gena.deserializer import (
    generate_deserializer,
    get_dataclass_deserializer,
    get_deserializer_from_type,
)
from peewee import DoesNotExist, fn
from sand.controllers.base import BaseController
from sand.extension_interface.export import IExport
from sand.models import SemanticModel, Table, TableRow
from sand.models.table import ContentHierarchy, Link
from sm.misc.funcs import import_func
from werkzeug.exceptions import BadRequest, NotFound


class TableController(BaseController):
    def get_blueprint(self) -> Blueprint:
        bp = generate_api(
            Table,
            deserializers=dict(
                context_tree=deser_context_tree,
                **generate_deserializer(
                    Table, known_field_deserializers={"context_tree"}
                ),
            ),
        )
        bp.add_url_rule(
            f"/{bp.name}/<id>/export-models",
            methods=["GET"],
            view_func=self.export_sms,
        )
        bp.add_url_rule(
            f"/{bp.name}/<id>/export",
            methods=["GET"],
            view_func=self.export_table_data,
        )
        return bp

    def export_sms(self, id: int):
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
        for sm in sms:
            for n in sm.iter_nodes():
                if isinstance(n, O.ClassNode):
                    assert n.readable_label is not None
                    # if n.readable_label is None:
                    #     n.readable_label = (
                    #         tmp.readable_label
                    #         if (tmp := ontclass_ar.get_by_uri(n.abs_uri)) is not None
                    #         else n.rel_uri
                    #     )
            for e in sm.iter_edges():
                if e.readable_label is None:
                    assert e.readable_label is not None
                    # e.readable_label = (
                    #     tmp.readable_label
                    #     if (tmp := ontprop_ar.get_by_uri(e.abs_uri)) is not None
                    #     else e.rel_uri
                    # )

        resp = jsonify([sm.to_dict() for sm in sms])
        if request.args.get("attachment", "false") == "true":
            resp.headers["Content-Disposition"] = "attachment; filename=export.json"
        return resp

    def export_table_data(self, id: int):
        # load table
        table: Table = Table.get_by_id(id)

        # load models
        subquery = (
            SemanticModel.select(
                SemanticModel.id, fn.MAX(SemanticModel.version).alias("version")
            )
            .where(SemanticModel.table == table)
            .group_by(SemanticModel.table, SemanticModel.name)
            .alias("q1")
        )
        query = (
            SemanticModel.select()
            .where(SemanticModel.table == table)
            .join(subquery, on=(SemanticModel.id == subquery.c.id))
        )
        sms: List[SemanticModel] = list(query)

        if len(sms) == 0:
            raise BadRequest("Exporting data requires the table to be modeled")

        sm_name = request.args["sm"] if "sm" in request.args else sms[0].name
        sms = [sm for sm in sms if sm.name == sm_name]
        if len(sms) == 0:
            raise BadRequest(f"The semantic model with name {sm_name} is not found")
        sm = sms[0]

        # load rows
        rows: List[TableRow] = list(TableRow.select().where(TableRow.table == table))

        # export the data using drepr library
        content = self.get_export("default").export_data(
            table, rows, sm.data, OutputFormat.TTL
        )
        resp = make_response(content)
        resp.headers["Content-Type"] = "text/ttl; charset=utf-8"
        if request.args.get("attachment", "false") == "true":
            resp.headers["Content-Disposition"] = "attachment; filename=export.ttl"
        return resp

    @lru_cache
    def get_export(self, name: Literal["default"] | str) -> IExport:
        return import_func(self.app_cfg.export.get_func(name))()


def deser_context_tree(value) -> List[ContentHierarchy]:
    if len(value) == 0:
        return []
    raise NotImplementedError()


table_row_bp = generate_api(TableRow)
deser_list_links = get_deserializer_from_type(List[Link], {})
assert deser_list_links is not None


@dataclass
class UpdateColumnLinksInput:
    table: int
    column: int
    text: str
    entity_id: Optional[str]


deser_update_column_links = get_dataclass_deserializer(UpdateColumnLinksInput, {})
assert deser_update_column_links is not None


@table_row_bp.route(f"/{table_row_bp.name}/<id>/cells/<column>", methods=["PUT"])
def update_cell_link(id: int, column: int):
    """
    Update the link entity & candidate entities for a given table row and column.
    """
    try:
        row: TableRow = TableRow.get_by_id(id)
    except DoesNotExist:
        raise NotFound(f"Record {id} does not exist")

    try:
        column = int(column)
        if column >= len(row.row):
            raise BadRequest(f"Invalid column {column} value")
    except ValueError:
        raise BadRequest(f"Column {column} is not an integer")

    request_json = request.get_json()
    if request_json is None:
        raise BadRequest("Missing request body")

    if "links" not in request_json:
        raise KeyError(f"Field 'links' is required")
    if not isinstance(request_json["links"], list) or not all(
        isinstance(link, dict) for link in request_json["links"]
    ):
        raise KeyError(f"Field 'links' must be a list of dictionaries")

    if (
        len(request_json["links"]) > 0
        and "candidate_entities" not in request_json["links"][0]
    ):
        # add back the candidate so we can deserialize them
        for link in request_json["links"]:
            link["candidate_entities"] = []
        links: List[Link] = deser_list_links(request_json["links"])

        # then, we just need to update the links' entities
        if len(row.links.get(str(column), [])) == 0:
            row.links[str(column)] = links
        else:
            if len(row.links[str(column)]) != len(links):
                raise BadRequest(
                    "Number of links in request does not match number of links in database"
                )
            for i, link in enumerate(links):
                db_link = row.links[str(column)][i]
                db_link.start = link.start
                db_link.end = link.end
                db_link.entity_id = link.entity_id
    else:
        row.links[str(column)] = deser_list_links(request_json["links"])

    row.save()
    return jsonify({"success": True})


@table_row_bp.route(f"/{table_row_bp.name}/update_column_links", methods=["PUT"])
def update_column_links():
    request_json = request.get_json()
    if request_json is None:
        raise BadRequest("Missing request body")

    args: UpdateColumnLinksInput = deser_update_column_links(request_json)
    table: Table = Table.get_by_id(args.table)
    if args.column >= len(table.columns):
        raise BadRequest(f"Invalid column {args.column} value")

    rows: List[TableRow] = list(TableRow.select().where(TableRow.table == table))
    str_column = str(args.column)
    for row in rows:
        if str(row.row[args.column]) != args.text:
            continue

        if str_column not in row.links:
            row.links[str_column] = [
                Link(
                    start=0,
                    end=len(str(row.row[args.column])),
                    url=None,
                    entity_id=args.entity_id,
                    candidate_entities=[],
                )
            ]
        else:
            db_link = row.links[str_column][0]
            db_link.start = 0
            db_link.end = len(str(row.row[args.column]))
            db_link.entity_id = args.entity_id

        row.save()
    return jsonify({"success": True})
