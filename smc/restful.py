import re
from functools import partial
from typing import Type, Callable, Any, List, Optional

from flask import Blueprint, request, jsonify
from peewee import Model as PeeweeModel, DoesNotExist
from playhouse.shortcuts import model_to_dict
from werkzeug.exceptions import BadRequest, NotFound


def generate_peewee_restful_api(
    Model: Type[PeeweeModel],
    serialize: Optional[Callable[[Any], dict]] = None,
    batch_serialize: Optional[Callable[[List[Any]], List[dict]]] = None,
):
    name2field = {name: field for name, field in Model._meta.fields.items()}
    op_fields = {"fields", "limit", "offset"}
    norm_value = {name: field.db_value for name, field in Model._meta.fields.items()}

    table_name = Model._meta.table_name
    default_limit = str(50)

    if serialize is None:
        if hasattr(Model, "to_dict"):
            serialize = Model.to_dict
        else:
            serialize = partial(model_to_dict, recurse=False)

    if batch_serialize is None:
        batch_serialize = lambda lst: [serialize(item) for item in lst]

    assert len(op_fields.intersection(name2field.keys())) == 0

    bp = Blueprint(table_name, table_name)

    @bp.route(f"/{table_name}", methods=["GET"])
    def get():
        """Retrieving records matched a query"""
        if "fields" in request.args:
            fields = [name2field[name] for name in request.args["fields"].split(",")]
        else:
            fields = []
        limit = int(request.args.get("limit", default_limit))
        offset = int(request.args.get("offset", "0"))

        conditions = []
        reg = re.compile(r"(?P<name>[a-zA-Z_0-9]+)(?:\[(?P<op>[a-zA-Z0-9]+)\])?")
        for name, value in request.args.items():
            if name in op_fields:
                continue

            m = reg.match(name)
            if m is None:
                raise BadRequest(f"Invalid field name: {name}")

            name = m.group("name")
            if name not in name2field:
                raise BadRequest(f"Invalid field name: {name}")
            op = m.group("op")
            field = name2field[name]
            value = norm_value[name](value)

            if op is None:
                conditions.append(field == value)
            elif op == "gt":
                conditions.append(field > value)
            elif op == "gte":
                conditions.append(field >= value)
            elif op == "lt":
                conditions.append(field < value)
            elif op == "lte":
                conditions.append(field <= value)
            else:
                raise BadRequest(f"Does not support {op} yet")

        query = Model.select(*fields)
        if len(conditions) > 0:
            query = query.where(*conditions)
        return jsonify({
            "items": batch_serialize(query.limit(limit).offset(offset)),
            "total": query.count()
        })

    @bp.route(f"/{table_name}/<id>", methods=["GET"])
    def get_one(id):
        try:
            record = Model.get_by_id(id)
        except DoesNotExist as e:
            raise NotFound(f"Record {id} does not exist")

        return jsonify(serialize(record))

    return bp
