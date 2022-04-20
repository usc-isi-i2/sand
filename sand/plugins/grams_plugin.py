from typing import List, Tuple
from grams.inputs.linked_table import LinkedTable
from sand.models import (
    Project,
    Value,
    Link,
    Table,
    ContextPage,
    TableRow,
    SemanticModel,
)


def convert_linked_table(tbl: LinkedTable) -> Tuple[Table, List[TableRow]]:
    """Convert linked table to smc's tables and rows.
    Note that the project of the table is not set, which is supposed to be set later.
    """
    if tbl.context.page_entity_id is None:
        context_values = []
    else:
        context_values = [Value("entityid", tbl.context.page_entity_id)]

    if tbl.context.page_url is not None:
        context_page = ContextPage(
            tbl.context.page_url,
            tbl.context.page_title or "",
            tbl.context.page_entity_id,
        )
    else:
        context_page = None

    links = {}
    for ri, rlink in enumerate(tbl.links):
        if ri not in links:
            links[ri] = {}
        for ci, clinks in enumerate(rlink):
            ci = str(ci)
            if len(clinks) > 0:
                links[ri][ci] = []
                for clink in clinks:
                    links[ri][ci].append(
                        Link(
                            clink.start,
                            clink.end,
                            clink.url,
                            clink.entity_id,
                            [],
                        )
                    )

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
