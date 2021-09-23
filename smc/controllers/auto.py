from smc.models.project import Project
from smc.models.table import Table, TableRow
from smc.restful import generate_peewee_restful_api

project_bp = generate_peewee_restful_api(Project)
table_bp = generate_peewee_restful_api(Table)
tablerow_bp = generate_peewee_restful_api(TableRow)
