import json
from flask import jsonify, request
from flask.blueprints import Blueprint
from werkzeug.exceptions import BadRequest
import traceback

from RestrictedPython import compile_restricted_function
from RestrictedPython import safe_globals

from sand.models.table import Link, Table, TableRow
from typing import Dict, List, Union
import re

transform_bp = Blueprint("transform", "transform")


def transform_map(transform_func, data, tolerance):
    transformed_data = []
    exec_tolerance = tolerance
    for path, value in data:
        tdata = dict()
        tdata["path"] = path
        tdata["value"] = value
        try:
            result = transform_func(value)
            tdata["ok"] = result
            transformed_data.append(tdata)
        except Exception as err:
            # fix this.
            if exec_tolerance == 0:
                break
            pattern = re.compile(r'.*:.*', re.MULTILINE)
            # filtered_error = '\n'.join(re.findall(pattern, traceback.format_exc()))
            tdata["error"] = traceback.format_exc()
            transformed_data.append(tdata)
            exec_tolerance -= 1
            continue
    return transformed_data


def transform_filter(transform_func, data, tolerance):
    transformed_data = []
    exec_tolerance = tolerance
    for path, value in data:
        tdata = dict()
        tdata["path"] = path
        tdata["value"] = value
        try:
            result = transform_func(value)
            if type(result) != bool:
                raise BadRequest("filter transform function must return boolean value")
            tdata["ok"] = result
            transformed_data.append(tdata)
        except Exception as err:


            if exec_tolerance == 0:
                break
            pattern = re.compile(r'.*:.*', re.MULTILINE)
            filtered_error = '\n'.join(re.findall(pattern, traceback.format_exc()))
            tdata["error"] = filtered_error
            transformed_data.append(tdata)
            exec_tolerance -= 1
            continue
    return transformed_data


def transform_split(transform_func, data, tolerance):
    transformed_data = []
    exec_tolerance = tolerance
    for path, value in data:
        tdata = dict()
        tdata["path"] = path
        tdata["value"] = value
        try:
            result = transform_func(value)
            if type(result) != list:
                raise BadRequest("filter transform function must return list")
            tdata["ok"] = result
            transformed_data.append(tdata)
        except Exception as err:
            if exec_tolerance == 0:
                break
            pattern = re.compile(r'.*:.*', re.MULTILINE)
            filtered_error = '\n'.join(re.findall(pattern, traceback.format_exc()))
            tdata["error"] = filtered_error
            transformed_data.append(tdata)
            exec_tolerance -= 1
            continue
    return transformed_data


def transform_concatenate(transform_func, data, tolerance):
    pass


@transform_bp.route(f"/{transform_bp.name}/<table_id>/transformations", methods=["POST"])
def transform(table_id: int):
    table = Table.get_by_id(table_id)
    table_rows: List[TableRow] = list(
        TableRow.select().where(TableRow.table == table).order_by(TableRow.index)
    )
    transform_type = request.json['type']
    mode = request.json['mode']
    datapath = request.json['datapath']
    code = request.json['code']
    tolerance = request.json['tolerance']
    outputpath = None
    if "outputpath" in request.json:
        outputpath = request.json['outputpath']
    rows = request.json['rows']

    loc = {}
    # add test case for incorrect user function.
    compiled_result = compile_restricted_function('value', code, 'transform')
    exec(compiled_result.code, safe_globals, loc)
    # capture error wrong function.
    transform_func = loc['transform']

    col_index = table.columns.index(datapath)

    data = []

    for table_row in table_rows:
        data.append(table_row.row[col_index])

    data = ((table_row.index, table_row.row[col_index]) for table_row in table_rows)

    if transform_type not in ["map", "filter", "split", "concatenate"]:
        raise BadRequest("Invalid value for `type` ")

    if transform_type == 'map':
        if outputpath:
            if len(outputpath) != 1:
                raise BadRequest("For transform type map the outputpath should be a single column")
        transformed_data = transform_map(transform_func, data, tolerance)

    elif transform_type == 'filter':
        if outputpath:
            if len(outputpath) != 1:
                raise BadRequest("For transform type map the outputpath should be a single column")
        transformed_data = transform_filter(transform_func, data, tolerance)

    elif transform_type == 'split':
        if outputpath is None:
            raise BadRequest("transform type split needs to have outputpath defined in the request body")
        transformed_data = transform_split(transform_func, data, tolerance)

    elif transform_type == 'concatenate':
        # throw error
        transformed_data = None

    return jsonify(transformed_data)
