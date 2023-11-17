import sys
import traceback
from typing import Dict, List, Callable, Any, Union, Iterable, Tuple, Optional, Literal
from typing_extensions import NotRequired, TypedDict
from dataclasses import dataclass

from flask import jsonify, request
from flask.blueprints import Blueprint
from RestrictedPython import compile_restricted_function, safe_globals
from werkzeug.exceptions import BadRequest

from sand.models.table import Link, Table, TableRow
from gena.deserializer import get_dataclass_deserializer
from gena import generate_api
from sand.models import Transformation

transformation_bp = generate_api(Transformation)


@dataclass
class Context:
    """Context dataclass to access the row of the cell that is being transformed."""

    index: int
    row: List[Union[str, float]]


@dataclass
class TransformRequestPayload:
    """Request Payload dataclass to validate the request obtained from the API call"""

    type: Literal["map", "filter", "split", "concatenate"]
    table_id: int
    mode: str
    datapath: Union[str, List[str]]
    code: str
    tolerance: int
    rows: Optional[int] = None
    outputpath: Optional[Union[str, List[str]]] = None


transform_request_deserializer = get_dataclass_deserializer(TransformRequestPayload, {})


class Tdata(TypedDict):
    path: int
    value: Union[str, List[str]]
    ok: NotRequired[Union[List, int, str, Iterable]]
    error: NotRequired[str]


def filter_traceback_errors() -> str:
    """Filters traceback errors, removes sensitive information

    Args:

    Returns:
        Error String without the sensitive information.
    """
    (exc, value, tb) = sys.exc_info()
    tb = tb.tb_next
    return "".join(traceback.format_exception(exc, value, tb))


Item = Any
ItemIndex = int


def transform_map(
    transform_func: Callable[[Any, Context], Any],
    data: Iterable[Tuple[ItemIndex, Item, Context]],
    tolerance: int,
) -> List[Tdata]:
    """Implements map transform, performs map operation over each cell, for a given column

    Args:
        transform_func: User defined python function defined by the user
        data: iterable with Column data and context object
        tolerance: contains the API request data

    Returns:
        list of Tdata objects, data transformed after applying map transform
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


def transform_filter(
    transform_func: Callable[[Any, Context], Any],
    data: Iterable[Tuple[ItemIndex, Item, Context]],
    tolerance: int,
) -> List[Tdata]:
    """Implements filter transform, performs filter operation over each cell, for a given column

    Args:
        transform_func: User defined python function defined by the user
        data: iterable with Column data and context object
        tolerance: contains the API request data

    Returns:
        list of Tdata objects, data transformed after applying filter transform

    Raises:
        BadRequest: An error occurred when the transform_func on execution, does not return a boolean
    """
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


def transform_split(
    transform_func: Callable[[Any, Context], Any],
    data: Iterable[Tuple[ItemIndex, Item, Context]],
    tolerance: int,
) -> List[Tdata]:
    """Implements split transform, performs split operation over each cell, for a given column

    Args:
        transform_func: User defined python function defined by the user
        data: iterable with Column data and context object
        tolerance: contains the API request data

    Returns:
        list of Tdata objects, data transformed after applying split transform

    Raises:
        BadRequest: An error occurred when transform_func on execution, does not return a list
    """
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


def transform_concatenate(
    transform_func: Callable[[Any, Context], Any],
    data: Iterable[Tuple[ItemIndex, Item, Context]],
    tolerance: int,
) -> List:
    """Implements concatenate transform, performs concatenate operation over each cell, for a given column

    Args:
        transform_func: User defined python function defined by the user
        data: iterable with Column data and context object
        tolerance: contains the API request data

    Returns:
        list of Tdata objects, data transformed after applying concatenate transform
    """
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
    """Implements __getitem__ restrictedpython policy and wraps _getitem_ function

    Args:
        obj: object that has __getitem__ implementation in python
        index: index of the element that can be accessed from obj

    Returns:
        object element at position index
    """
    return obj[index]


def compile_function(code: str) -> Callable:
    """Executes code in string in a restricted mode using restrictedpython

    Args:
        code: object that has __getitem__ implementation in python

    Returns:
        Callable function that wraps the code as a function body

    Raises:
        BadRequest: An error occurred when the code has compilation error
    """
    loc = {}
    safe_globals.update({"_getitem_": custom_getitem_guard})
    compiled_result = compile_restricted_function("value,context", code, "<function>")

    if compiled_result.errors:
        raise BadRequest("\n".join(compiled_result.errors))

    exec(compiled_result.code, safe_globals, loc)

    return loc["<function>"]


@transformation_bp.route(f"/{transformation_bp.name}/test", methods=["POST"])
def transform():
    if isinstance(request.json["datapath"], str):
        request.json["datapath"] = [request.json["datapath"]]

    request_data = transform_request_deserializer(request.json)
    table = Table.get_by_id(request_data.table_id)
    table_rows: List[TableRow] = list(
        TableRow.select().where(TableRow.table == table).order_by(TableRow.index)
    )
    transform_func = compile_function(request_data.code)
    col_index_list = [table.columns.index(column) for column in request_data.datapath]
    data = (
        (
            table_row.index,
            [table_row.row[col_index] for col_index in col_index_list],
            Context(index=table_row.index, row=table_row.row),
        )
        for table_row in table_rows[: request_data.rows]
    )

    transformed_data = None

    if request_data.type == "map":
        if request_data.outputpath and len(request_data.outputpath) != 1:
            raise BadRequest(
                "For transform type map the outputpath should be a single column"
            )
        transformed_data = transform_map(transform_func, data, request_data.tolerance)

    elif request_data.type == "filter":
        if request_data.outputpath and len(request_data.outputpath) != 1:
            raise BadRequest(
                "For transform type map the outputpath should be a single column"
            )
        transformed_data = transform_filter(
            transform_func, data, request_data.tolerance
        )

    elif request_data.type == "split":
        if request_data.outputpath is None:
            raise BadRequest(
                "transform type split needs to have outputpath defined in the request body"
            )
        transformed_data = transform_split(transform_func, data, request_data.tolerance)

    elif request_data.type == "concatenate":
        transformed_data = transform_concatenate(
            transform_func, data, request_data.tolerance
        )

    return jsonify(transformed_data)
