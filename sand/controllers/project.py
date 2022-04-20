import copy
import csv
from dataclasses import asdict
import os
from functools import partial
from io import StringIO
from typing import List, Optional, Union, cast, no_type_check_decorator

import orjson
import sm.misc as M
import sm.outputs as O
from flask import json, jsonify, request
from gena import generate_api, generate_app, generate_readonly_api_4dict
from gena.deserializer import (
    deserialize_dict,
    generate_deserializer,
    get_dataclass_deserializer,
)
from grams.inputs.context import Attribute
from hugedict.chained_mapping import ChainedMapping
from peewee import DoesNotExist
from peewee import Model as PeeweeModel
from peewee import fn
from sand.controllers.helpers.upload import (
    ALLOWED_EXTENSIONS,
    CSVParserOpts,
    RawTable,
    UploadingTable,
    get_extension,
    parse_upload,
    save_upload,
)
from sand.deserializer import deserialize_graph
from sand.models import (
    EntityAR,
    Project,
    SemanticModel,
    Table,
    TableRow,
)
from sand.models.entity import Value
from sand.models.ontology import OntClass, OntClassAR, OntProperty, OntPropertyAR
from sand.plugins.wikidata import DEFAULT_ONT_CLASSES, DEFAULT_ONT_PROPS
from sand.serializer import (
    batch_serialize_sms,
    get_label,
    serialize_class,
    serialize_entity,
    serialize_property,
)
from werkzeug.datastructures import FileStorage
from werkzeug.exceptions import BadRequest
from sand.controllers.helpers.upload import CSVParserOpts, JSONParserOpts

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
