import tempfile
from dataclasses import asdict
from pathlib import Path
from typing import List

import orjson
from flask import jsonify, make_response, request
from gena import generate_api
from gena.deserializer import get_dataclass_deserializer
from sm.dataset import Dataset, Example, FullTable
from sm.prelude import I, M, O
from werkzeug.exceptions import BadRequest

from sand.controllers.helpers.upload import (
    ALLOWED_EXTENSIONS,
    CSVParserOpts,
    JSONParserOpts,
    UploadingTable,
    get_extension,
    parse_upload,
    save_upload,
)
from sand.controllers.table import get_friendly_fs_name
from sand.models import Project
from sand.models.semantic_model import SemanticModel
from sand.models.table import Table, TableRow

project_bp = generate_api(Project)

deser_CSVParserOpts = get_dataclass_deserializer(CSVParserOpts, {})
deser_JSONParserOpts = get_dataclass_deserializer(JSONParserOpts, {})
assert deser_CSVParserOpts is not None
assert deser_JSONParserOpts is not None


@project_bp.route(f"/{project_bp.name}/<id>/upload", methods=["POST"])
def upload(id: int):
    """Upload tables to the project"""
    files = {}

    for file_id, file in request.files.items():
        if (
            file
            and file.filename is not None
            and get_extension(file.filename) in ALLOWED_EXTENSIONS
        ):
            files[file_id] = file

    if len(files) == 0:
        raise BadRequest(f"No files provided")

    if "parser_opts" in request.form:
        try:
            raw_parser_opts = orjson.loads(request.form["parser_opts"])
        except ValueError:
            raise BadRequest("Invalid vaue for `parser_opts`")

        if not isinstance(raw_parser_opts, dict):
            raise BadRequest(
                "Invalid value for `parser_opts`. Expect a dictionary of parser options for each file id"
            )

        if len(set(raw_parser_opts.keys()).difference(files.keys())) > 0:
            raise BadRequest(
                "Invalid value for `parser_opts`. Contains unknown file ids"
            )

        parser_opts = {}
        for file_id, opts in raw_parser_opts.items():
            if not isinstance(opts, dict) or "format" not in opts:
                raise BadRequest(
                    f"Invalid parser options for `{file_id}`. Expect a dictionary with a `format` key"
                )
            if opts["format"] == "csv":
                parser_opts[file_id] = deser_CSVParserOpts(opts)
            elif opts["format"] == "json":
                parser_opts[file_id] = deser_JSONParserOpts(opts)
            else:
                raise BadRequest(f"Invalid format `{file_id}`.")
    else:
        parser_opts = {}

    # parse the content
    tables: List[UploadingTable] = []
    for file_id, file in files.items():
        tables += parse_upload(parser_opts.get(file_id, None), file)

    if "selected_tables" in request.form:
        # signal that we go ahead with the selected tables and save it to the database
        try:
            selected_tables = orjson.loads(request.form["selected_tables"])
        except ValueError:
            raise BadRequest("Invalid value for `selected_tables`")

        raw_tables = [raw_table for table in tables for raw_table in table.tables]
        if (
            not isinstance(selected_tables, list)
            or len(selected_tables) == 0
            or any(
                not isinstance(x, int) or x < 0 or x >= len(raw_tables)
                for x in selected_tables
            )
        ):
            raise BadRequest("`selected_tables` must be a list of numbers")

        try:
            project = Project.get_by_id(id)
        except:
            raise BadRequest("Project not found")

        # rename duplicated tables
        names = {}
        for i, tbl in enumerate(raw_tables):
            if tbl.name not in names:
                names[tbl.name] = [i, 1]
            else:
                names[tbl.name][1] += 1
                raw_tables[names[tbl.name][0]].name = tbl.name + "-1"
                tbl.name = tbl.name + "-" + names[tbl.name][1]

        dbtables = save_upload(project, [raw_tables[i] for i in selected_tables])
        return jsonify(
            {"status": "success", "table_ids": [table.id for table in dbtables]}
        )

    return jsonify(
        {
            "status": "success",
            "tables": [
                {
                    "parser_opts": asdict(table.parser_opts),
                    "tables": [asdict(raw_table) for raw_table in table.tables],
                }
                for table in tables
            ],
        }
    )


@project_bp.route(f"/{project_bp.name}/<id>/export", methods=["GET"])
def export(id: int):
    """Export tables from the project"""
    try:
        project = Project.get_by_id(id)
    except:
        raise BadRequest("Project not found")

    examples = []
    for tbl in Table.select().where(Table.project == project):
        tblrows = list(TableRow.select().where(TableRow.table == tbl))
        basetbl = I.ColumnBasedTable.from_rows(
            records=[row.row for row in tblrows],
            table_id=tbl.name,
            headers=tbl.columns,
            strict=True,
        )
        table = FullTable(
            table=basetbl,
            context=(
                I.Context(
                    page_title=tbl.context_page.title,
                    page_url=tbl.context_page.url,
                    entities=(
                        [I.EntityId(tbl.context_page.entity, "")]
                        if tbl.context_page.entity is not None
                        else []
                    ),
                )
                if tbl.context_page is not None
                else I.Context()
            ),
            links=M.Matrix.default(basetbl.shape(), list),
        )
        table.links = table.links.map_index(
            lambda ri, ci: tblrows[ri].links.get(ci, [])
        )

        ex = Example(id=table.table.table_id, sms=[], table=table)

        for sm in SemanticModel.select().where(SemanticModel.table == tbl):
            ex.sms.append(sm.data)

        examples.append(ex)

    with tempfile.NamedTemporaryFile(suffix=".zip") as file:
        Dataset(Path(file.name)).save(examples, table_fmt_indent=2)
        dataset = Path(file.name).read_bytes()

    resp = make_response(dataset)
    resp.headers["Content-Type"] = "application/zip; charset=utf-8"
    resp.headers["Content-Disposition"] = (
        f"attachment; filename={get_friendly_fs_name(str(project.name))}.zip"
    )
    return resp
