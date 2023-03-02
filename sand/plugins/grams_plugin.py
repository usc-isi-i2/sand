from typing import List, Tuple
from grams.inputs.linked_table import LinkedTable
from sand.models import (
    Value,
    Link,
    Table,
    ContextPage,
    TableRow,
)


def convert_linked_table(tbl: LinkedTable) -> Tuple[Table, List[TableRow]]:
    """Convert linked table to smc's tables and rows.
    Note that the project of the table is not set, which is supposed to be set later.
    """
    context_values = [
        Value("entityid", str(entityid)) for entityid in tbl.context.page_entities
    ]

    if tbl.context.page_url is not None:
        context_page = ContextPage(
            tbl.context.page_url,
            tbl.context.page_title or "",
            str(tbl.context.page_entities[0])
            if len(tbl.context.page_entities) > 0
            else None,
        )
    else:
        context_page = None

    links = {}
    for ri in range(tbl.size()):
        links[ri] = {}

    for ri, ci, lst in tbl.links.enumerate_flat_iter():
        if len(lst) == 0:
            continue
        links[ri][ci] = [
            Link(
                start=l.start,
                end=l.end,
                url=l.url,
                entity_id=str(l.entities[0]) if len(l.entities) > 0 else None,
                candidate_entities=[],  # do not load the entities because this is filled by methods
            )
            for l in lst
        ]

    columns = [col.name for col in tbl.table.columns]
    mtbl = Table(
        name=tbl.id,
        description="",
        columns=columns,
        size=tbl.size(),
        context_values=context_values,
        context_tree=[],
        context_page=context_page,
        project=None,
    )
    mrows = []

    for ri in range(tbl.size()):
        row = [tbl.table[ri, ci] for ci in range(len(columns))]
        mrows.append(TableRow(table=mtbl, index=ri, row=row, links=links[ri]))

    return mtbl, mrows
