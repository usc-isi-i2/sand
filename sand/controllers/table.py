from __future__ import annotations

import csv
import zipfile
from dataclasses import dataclass
from functools import lru_cache
from io import BytesIO, StringIO
from typing import List, Literal, Optional

import sm.outputs.semantic_model as O
from dependency_injector.wiring import Provide, inject
from drepr.engine import OutputFormat
from flask import jsonify, make_response, request
from gena import generate_api
from gena.deserializer import (
    generate_deserializer,
    get_dataclass_deserializer,
    get_deserializer_from_type,
)
from peewee import DoesNotExist, fn
from sm.misc.funcs import import_func
from werkzeug.exceptions import BadRequest, NotFound

from sand.config import AppConfig
from sand.deserializer import deser_context_tree
from sand.extension_interface.export import IExport
from sand.helpers.namespace import NamespaceService
from sand.helpers.service_provider import MultiServiceProvider
from sand.models import SemanticModel, Table, TableRow
from sand.models.ontology import OntClassAR, OntPropertyAR
from sand.models.table import Link

table_bp = generate_api(
    Table,
    deserializers=dict(
        context_tree=deser_context_tree,
        **generate_deserializer(Table, known_field_deserializers={"context_tree"}),
    ),
)


@table_bp.route(
    f"/{table_bp.name}/<id>/export-semantic-models",
    methods=["GET"],
)
@inject
def export_sms(
    id: int,
    ontclass_ar: OntClassAR = Provide["classes"],
    ontprop_ar: OntPropertyAR = Provide["properties"],
):
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
                if n.readable_label is None:
                    n.readable_label = (
                        tmp.readable_label
                        if (tmp := ontclass_ar.get_by_uri(n.abs_uri)) is not None
                        else None
                    )
        for e in sm.iter_edges():
            if e.readable_label is None:
                if e.readable_label is None:
                    e.readable_label = (
                        tmp.readable_label
                        if (tmp := ontprop_ar.get_by_uri(e.abs_uri)) is not None
                        else None
                    )

    resp = jsonify([sm.to_dict() for sm in sms])
    if request.args.get("attachment", "false") == "true":
        resp.headers["Content-Disposition"] = (
            f"attachment; filename=semantic-models.json"
        )
    return resp


@table_bp.route(
    f"/{table_bp.name}/<id>/export-linked-entities",
    methods=["GET"],
)
@inject
def export_linked_entities(
    id: int, export: MultiServiceProvider[IExport] = Provide["export"]
):
    table: Table = Table.get_by_id(id)
    rows: List[TableRow] = list(TableRow.select().where(TableRow.table == table))

    output = []
    for ri, row in enumerate(rows):
        for ci, col in enumerate(row.row):
            links = row.links.get(str(ci), [])
            for link in links:
                output.append(
                    {
                        "row": ri,
                        "col": ci,
                        "start": link.start,
                        "end": link.end,
                        "url": link.url,
                        "entity": link.entity_id,
                    }
                )
    f = StringIO()
    writer = csv.writer(
        f, delimiter=",", quoting=csv.QUOTE_MINIMAL, lineterminator="\n"
    )
    header = ["row", "col", "start", "end", "url", "entity"]
    writer.writerow(header)
    for record in output:
        writer.writerow([record[h] for h in header])
    resp = make_response(f.getvalue())
    resp.headers["Content-Type"] = "text/csv; charset=utf-8"
    if request.args.get("attachment", "false") == "true":
        resp.headers["Content-Disposition"] = f"attachment; filename={table.name}.csv"
    return resp


@table_bp.route(
    f"/{table_bp.name}/<id>/export-full-model",
    methods=["GET"],
)
@inject
def export_full_model(
    id: int, export: MultiServiceProvider[IExport] = Provide["export"]
):
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

    if "sm" in request.args:
        sms = [sm for sm in sms if sm.name == request.args["sm"]]
        if len(sms) == 0:
            raise BadRequest(
                f"The semantic model with name {request.args['sm']} is not found"
            )
    else:
        if len(sms) != 1:
            raise BadRequest(
                "There are more than one semantic model for this table. Please specify the semantic model you want to export via the 'sm' query parameter"
            )
    sm = sms[0]
    rows: List[TableRow] = list(TableRow.select().where(TableRow.table == table))
    # export the data using drepr library
    export_obj = export.get_default()
    datamodel = export_obj.export_data_model(table, sm.data)
    resources = export_obj.export_extra_resources(table, rows, sm.data)

    # make a zip file and return it
    # output = StringIO()
    output = BytesIO()
    with zipfile.ZipFile(output, "w") as zip_file:
        for name, content in datamodel.items():
            with zip_file.open(name, "w") as f:
                f.write(content.encode())
        for res_name, res_content in resources.items():
            assert f"{res_name}.txt" not in datamodel
            with zip_file.open(f"{res_name}.txt", "w") as f:
                f.write(res_content.encode())
    resp = make_response(output.getvalue())
    resp.headers["Content-Type"] = "application/zip; charset=utf-8"
    resp.headers["Content-Disposition"] = f"attachment; filename={table.name}.zip"
    return resp


@table_bp.route(
    f"/{table_bp.name}/<id>/export",
    methods=["GET"],
)
@inject
def export_table_data(
    id: int, export: MultiServiceProvider[IExport] = Provide["export"]
):
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

    if "sm" in request.args:
        sms = [sm for sm in sms if sm.name == request.args["sm"]]
        if len(sms) == 0:
            raise BadRequest(
                f"The semantic model with name {request.args['sm']} is not found"
            )
    else:
        if len(sms) != 1:
            raise BadRequest(
                "There are more than one semantic model for this table. Please specify the semantic model you want to export via the 'sm' query parameter"
            )
    sm = sms[0]

    # load rows
    rows: List[TableRow] = list(TableRow.select().where(TableRow.table == table))

    # export the data using drepr library
    content = export.get_default().export_data(table, rows, sm.data, OutputFormat.TTL)
    resp = make_response(content)
    resp.headers["Content-Type"] = "text/ttl; charset=utf-8"
    if request.args.get("attachment", "false") == "true":
        resp.headers["Content-Disposition"] = f"attachment; filename={table.name}.ttl"
    return resp


@lru_cache
@inject
def get_export(
    name: Literal["default"] | str, appcfg: AppConfig = Provide["appcfg"]
) -> IExport:
    return import_func(appcfg.export.get_func(name))()


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
