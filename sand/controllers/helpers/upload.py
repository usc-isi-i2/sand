from uuid import uuid4
import csv
from dataclasses import dataclass
from io import StringIO
from typing import Dict, List, Literal, Optional, Union, cast

import orjson
from sand.models.project import Project
from sand.models.table import Link, Table, TableRow
from werkzeug.datastructures import FileStorage
from sand.models import db


@dataclass
class CSVParserOpts:
    format: Literal["csv"] = "csv"
    delimiter: str = ","
    # whether the first row in header
    first_row_is_header: bool = True


@dataclass
class JSONParserOpts:
    format: Literal["json"] = "json"


ParserOpts = Union[CSVParserOpts, JSONParserOpts]


@dataclass
class RawTable:
    name: str
    header: List[str]
    # each item in the outer list of `rows` and `links` is for a row
    rows: List[List[Union[str, int, float]]]
    links: List[Dict[str, List[Link]]]


@dataclass
class UploadingTable:
    parser_opts: ParserOpts
    tables: List[RawTable]


ALLOWED_EXTENSIONS = {"json", "csv", "tsv"}


def get_extension(filename: str) -> Optional[str]:
    lst = filename.rsplit(".", 1)
    if len(lst) == 1:
        return None
    return lst[1].lower()


def save_upload(project: Project, raw_tables: List[RawTable]) -> List[Table]:
    """Save the upload results to the database"""
    with db:
        cursor = Table.select(Table.name).where(
            (Table.project == project) & (Table.name.in_([x.name for x in raw_tables]))
        )
        existing_names = {x.name for x in cursor}

        tables = []
        for raw_table in raw_tables:
            if raw_table.name not in existing_names:
                name = raw_table.name
            else:
                name = f"{raw_table.name}-{str(uuid4()).replace('-', '')}"

            table = Table(
                name=name,
                description="",
                columns=raw_table.header,
                project=project,
                size=len(raw_table.rows),
                context_values=[],
                context_tree=[],
            )
            table.save()
            tables.append(table)

        table_rows = []
        for raw_table, table in zip(raw_tables, tables):
            for i, row in enumerate(raw_table.rows):
                table_rows.append(
                    TableRow(table=table, index=i, row=row, links=raw_table.links[i])
                )

        TableRow.bulk_create(table_rows, batch_size=200)
        return tables


def parse_upload(
    user_preferred_parser_opts: Optional[ParserOpts], file: FileStorage
) -> List[UploadingTable]:
    assert file.filename is not None

    name = file.filename.rsplit(".", 1)[0]
    if user_preferred_parser_opts is not None:
        parser_opts = user_preferred_parser_opts
    else:
        ext = get_extension(file.filename)
        if ext in {"csv", "tsv"}:
            delimiter = "," if ext == "csv" else "\t"
            parser_opts = CSVParserOpts(format="csv", delimiter=delimiter)
        elif ext == "json":
            parser_opts = JSONParserOpts(format="json")
        else:
            raise ValueError(f"Invalid format: {ext}")

    if isinstance(parser_opts, CSVParserOpts):
        return parse_csv_file(name, file, parser_opts)

    if isinstance(parser_opts, JSONParserOpts):
        return parse_json_file(name, file, parser_opts)

    raise NotImplementedError()


def parse_csv_file(name: str, file: FileStorage, parser_opts: CSVParserOpts):
    reader = csv.reader(StringIO(file.read().decode()), delimiter=parser_opts.delimiter)
    rows = list(reader)

    n_columns = max(len(row) for row in rows)

    if parser_opts.first_row_is_header:
        header, rows = rows[0], rows[1:]
        if len(header) < n_columns:
            for i in range(len(header), n_columns):
                header.append(f"")
    else:
        header = [""] * n_columns

    for row in rows:
        if len(row) < n_columns:
            row.extend([""] * (n_columns - len(row)))

    return [
        UploadingTable(
            parser_opts=parser_opts,
            tables=[
                RawTable(
                    name=name,
                    header=header,
                    rows=cast(List[List[Union[str, int, float]]], rows),
                    links=[{} for _ in rows],
                )
            ],
        )
    ]


def parse_json_file(name: str, file: FileStorage, parser_opts: JSONParserOpts):
    records = orjson.loads(file.read())
    if not isinstance(records, list):
        raise Exception("JSON file must contain a list of rows")

    # now normalize and check the content & construct schema
    attrs = {}
    for record in records:
        for key, value in record:
            if key not in attrs:
                attrs[key] = len(attrs)

            if value is not None and not isinstance(value, (str, int, float)):
                raise Exception(
                    f"Invalid value type for attribute {key}. Expect string, number, or null"
                )

    rows = []
    header = list(attrs.keys())
    for record in records:
        rows.append([record.get(key, None) for key in attrs])

    return [
        UploadingTable(
            parser_opts=parser_opts,
            tables=[
                RawTable(name=name, header=header, rows=rows, links=[{} for _ in rows])
            ],
        )
    ]
