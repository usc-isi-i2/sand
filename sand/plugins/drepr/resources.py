from dataclasses import dataclass
from io import StringIO
import orjson, csv
from typing import Dict, List, Set, Tuple
from sand.config import SETTINGS
from sand.models.entity import NIL_ENTITY, Entity
from sand.models.ontology import OntPropertyAR
from sand.models.table import Table, TableRow
from drepr.models import (
    ResourceDataString,
    ResourceData,
)
from uuid import uuid4


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
    table: Table, rows: List[TableRow], ent_columns: Set[int]
) -> ResourceData:
    """Return a CSV resource of matrix mapping each position in a table to a corresponding entity uri."""
    new_entity_template: str = SETTINGS["entity"]["new_entity_template"]
    ent_rows: List[List[str]] = []

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
                if link.entity_id is not None and link.entity_id != NIL_ENTITY:
                    ent = Entity.id2uri(link.entity_id)
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
