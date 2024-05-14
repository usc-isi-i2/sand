import csv
from io import StringIO
from typing import List, Set
from uuid import uuid4

from drepr.models.prelude import ResourceData, ResourceDataString

from sand.config import AppConfig
from sand.helpers.namespace import NamespaceService
from sand.models.table import Table, TableRow


def get_table_resource(table: Table, rows: List[TableRow]) -> ResourceData:
    """Return a CSV resource, in which the first row is the header"""
    f = StringIO()
    writer = csv.writer(
        f, delimiter=",", quoting=csv.QUOTE_MINIMAL, lineterminator="\n"
    )

    writer.writerow(table.columns)
    for row in rows:
        writer.writerow(row.row)

    return ResourceDataString(f.getvalue())


def get_entity_resource(
    appcfg: AppConfig,
    ns: NamespaceService,
    table: Table,
    rows: List[TableRow],
    ent_columns: Set[int],
) -> ResourceData:
    """Return a CSV resource of matrix mapping each position in a table to a corresponding entity uri."""
    new_entity_template: str = appcfg.entity.new_entity_template
    ent_rows: List[List[str]] = []
    kgns = ns.kgns

    for ri, row in enumerate(rows):
        ent_rows.append([])
        for ci in range(len(row.row)):
            if ci not in ent_columns:
                ent_rows[-1].append("")
                continue

            links = row.links.get(str(ci), [])
            # TODO: what happens when there are multiple entities?
            # for now, just return the first entity
            ent = None
            for link in links:
                if (
                    link.entity_id is not None
                    and link.entity_id != appcfg.entity.nil.id
                ):
                    ent = kgns.id_to_uri(link.entity_id)
                    break
            else:
                # generate new entity
                ent = new_entity_template.format(id=str(uuid4()))

            ent_rows[-1].append(ent)

    f = StringIO()
    writer = csv.writer(
        f, delimiter=",", quoting=csv.QUOTE_MINIMAL, lineterminator="\n"
    )

    writer.writerow(table.columns)
    for row in ent_rows:
        writer.writerow(row)
    return ResourceDataString(f.getvalue())
