# from dataclasses import asdict
#
# from flask import Blueprint, request, jsonify
# from werkzeug.exceptions import BadRequest
#
# from smc.controllers.restful import generate_peewee_restful_api
# from smc.models.project import Project
# from smc.models.table import Table, TableRow
#
# bp = generate_peewee_restful_api(Table)
#
#
# # @bp.route("/v1/tables", methods=["GET"])
# # def controller__table__query2():
# #     offset = int(request.args.get("offset", "0"))
# #     limit = int(request.args.get("limit", "50"))
# #
# #
# #
# #     request.args.get("fields", [])
# #
# #     return jsonify([
# #         {"id": table.id, "name": table.name, "description": table.description}
# #         for table in Table.select().offset(offset).limit(limit)
# #     ])
# #
# #
# # @bp.route("/v1/projects/<project_name>/tables/<table_name>", methods=["GET"])
# # def controller__table__query(project_name: str, table_name: str):
# #     project = Project.get(Project.name == project_name)
# #
# #     if "data" in request.args:
# #         offset = int(request.args.get("offset", "0"))
# #         limit = int(request.args.get("limit", "50"))
# #
# #         table = (
# #             Table.select(Table.id, Table.links)
# #             .where(Table.project == project, Table.name == table_name)
# #             .get()
# #         )
# #
# #         rows = TableRow.select().where(
# #             TableRow.table == table,
# #             TableRow.index >= offset,
# #             TableRow.index < (offset + limit),
# #         )
# #         links = {}
# #         for i, row in enumerate(rows):
# #             if i + offset in table.links:
# #                 links[i + offset] = {
# #                     ci: [link._asdict() for link in lst]
# #                     for ci, lst in table.links[i + offset].items()
# #                 }
# #
# #         return jsonify(
# #             {"offset": offset, "rows": [row.row for row in rows], "links": links}
# #         )
# #
# #     table = Table.get(Table.project == project, Table.name == table_name)
# #     return jsonify(
# #         {
# #             "id": table.name,
# #             "project": project.name,
# #             "columns": table.columns,
# #             "records": table.size,
# #             "context_values": [asdict(v) for v in table.context_values],
# #             "context_tree": [v._asdict() for v in table.context_tree],
# #         }
# #     )
