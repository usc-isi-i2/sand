import json
import re
import sys
import traceback
from typing import Dict, List, Callable, Any, Union, Iterable

from flask import jsonify, request
from flask.blueprints import Blueprint
from RestrictedPython import compile_restricted_function, safe_globals
from werkzeug.exceptions import BadRequest

from sand.models.table import Link, Table, TableRow
from sand.models.transform import Context, Tdata, TransformRequestPayload
from gena.deserializer import get_dataclass_deserializer

deserializer = get_dataclass_deserializer(TransformRequestPayload, {})

transform_bp = Blueprint("transform", "transform")
USER_DEFINE_FUNCTION_NAME = ""


def filter_traceback_errors() -> str:
    """Filters traceback errors, removes sensitive information"""
    (exc, value, tb) = sys.exc_info()
    tb = tb.tb_next
    return "".join(traceback.format_exception(exc, value, tb))


def transform_map(transform_func: Callable[[Any, Context], Any], data: Iterable[List[Union[int, List, Context]]],
                  tolerance: int) -> List:
    """Implements map transform, performs map operation over each cell, for a given column

        Args:
            transform_func: User defined python function defined by the user
            data: Column data along with context object
            tolerance: contains the API request data

        Returns:
            transformed_data (str): List of data transformed after applying map transform
    """
    transformed_data = []
    for path, value, context in data:
        value = value[0]
        tdata = Tdata(path=path, value=value)
        try:
            result = transform_func(value, context)
            tdata["ok"] = result
        except Exception as err:
            tdata["error"] = filter_traceback_errors()
            tolerance -= 1
            if tolerance == 0:
                transformed_data.append(tdata)
                return transformed_data
        transformed_data.append(tdata)
    return transformed_data


def transform_filter(transform_func: Callable[[Any, Context], Any], data: Iterable[List[Union[int, List, Context]]],
                     tolerance: int) -> List:
    """Implements filter transform, performs filter operation over each cell, for a given column"""
    transformed_data = []
    for path, value, context in data:
        value = value[0]
        tdata = Tdata(path=path, value=value)
        try:
            result = transform_func(value, context)
            if not isinstance(result, bool):
                raise BadRequest("filter transform function must return boolean value")
            tdata["ok"] = result
        except Exception as err:
            tdata["error"] = filter_traceback_errors()
            tolerance -= 1
            if tolerance == 0:
                transformed_data.append(tdata)
                return transformed_data
        transformed_data.append(tdata)
    return transformed_data


def transform_split(transform_func: Callable[[Any, Context], Any], data: Iterable[List[Union[int, List, Context]]],
                    tolerance: int) -> List:
    """Implements split transform, performs split operation over each cell, for a given column"""
    transformed_data = []
    for path, value, context in data:
        value = value[0]
        tdata = Tdata(path=path, value=value)
        try:
            result = transform_func(value, context)
            if not isinstance(result, Iterable):
                raise BadRequest("split transform function must return list")
            tdata["ok"] = result
        except Exception as err:
            tdata["error"] = filter_traceback_errors()
            tolerance -= 1
            if tolerance == 0:
                transformed_data.append(tdata)
                return transformed_data
        transformed_data.append(tdata)
    return transformed_data


def transform_concatenate(transform_func: Callable[[Any, Context], Any],
                          data: Iterable[List[Union[int, List, Context]]], tolerance: int) -> List:
    """Implements concatenate transform, performs concatenate operation over each cell, for a given column"""

    transformed_data = []
    for path, value, context in data:
        tdata = Tdata(path=path, value=value)
        try:
            result = transform_func(value, context)
            tdata["ok"] = result
        except Exception as err:
            tdata["error"] = filter_traceback_errors()
            tolerance -= 1
            if tolerance == 0:
                transformed_data.append(tdata)
                return transformed_data
        transformed_data.append(tdata)
    return transformed_data


# overriding inbuilt _getitem_ guard function
def custom_getitem_guard(obj: Any, index: int) -> Any:
    """Implements __getitem__ restrictedpython policy and wraps _getitem_ function"""
    return obj[index]


def compile_function(code: str) -> Callable:
    """Executes code in string in a restricted mode using restrictedpython"""
    loc = {}
    safe_globals.update({'_getitem_': custom_getitem_guard})
    compiled_result = compile_restricted_function("value,context", code, "<function>")

    if compiled_result.errors:
        raise BadRequest("\n".join(compiled_result.errors))

    exec(compiled_result.code, safe_globals, loc)

    return loc["<function>"]


@transform_bp.route(
    f"/{transform_bp.name}/<table_id>/transformations", methods=["POST"]
)
def transform(table_id: int):
    table = Table.get_by_id(table_id)
    table_rows: List[TableRow] = list(
        TableRow.select().where(TableRow.table == table).order_by(TableRow.index)
    )

    if isinstance(request.json["datapath"], str):
        request.json["datapath"] = [request.json["datapath"]]

    if "rows" not in request.json:
        request.json["rows"] = len(table_rows)

    request_data = deserializer(request.json)

    transform_func = compile_function(request_data.code)

    col_index_list = [table.columns.index(column) for column in request_data.datapath]

    data = ([table_row.index, [table_row.row[col_index] for col_index in col_index_list],
             Context(index=table_row.index, row=table_row.row)] for table_row in table_rows[:request_data.rows])

    transformed_data = None

    if request_data.type == "map":
        if request_data.outputpath:
            if len(request_data.outputpath) != 1:
                raise BadRequest(
                    "For transform type map the outputpath should be a single column"
                )
        transformed_data = transform_map(transform_func, data, request_data.tolerance)

    elif request_data.type == "filter":
        if request_data.outputpath:
            if len(request_data.outputpath) != 1:
                raise BadRequest(
                    "For transform type map the outputpath should be a single column"
                )
        transformed_data = transform_filter(transform_func, data, request_data.tolerance)

    elif request_data.type == "split":
        if request_data.outputpath is None:
            raise BadRequest(
                "transform type split needs to have outputpath defined in the request body"
            )
        transformed_data = transform_split(transform_func, data, request_data.tolerance)

    elif request_data.type == "concatenate":
        transformed_data = transform_concatenate(transform_func, data, request_data.tolerance)

    return jsonify(transformed_data)
