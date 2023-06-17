from pathlib import Path
from typing import List, Tuple

import click
from sm.dataset import Dataset, Example, FullTable
from tqdm.auto import tqdm

from sand.models import (
    ContextPage,
    Link,
    Project,
    SemanticModel,
    Table,
    TableRow,
    Value,
)
from sand.models import db as dbconn
from sand.models import init_db


@click.command(name="load")
@click.option("-d", "--db", required=True, help="smc database file")
@click.option("-p", "--project", default="default", help="Project name")
@click.option("--dataset", required=True, help="Path to tables")
@click.option(
    "-n",
    "--n-tables",
    default=-1,
    type=int,
    help="Number of tables to load (negative number or zero to load all)",
)
def load_dataset(db: str, project: str, dataset: str, n_tables: int):
    """Load a dataset into a project"""
    init_db(db)

    examples = Dataset(Path(dataset)).load()

    if n_tables > 0:
        examples = examples[:n_tables]

    with dbconn:
        p = Project.get(name=project)
        for e in tqdm(examples, desc="Loading examples"):
            save_example(p, e)


def save_example(project: Project, example: Example[FullTable]):
    mtbl, mrows = convert_linked_table(example.table)
    mtbl.project = project
    mtbl.save()

    for row in mrows:
        row.save()

    for i, sm in enumerate(example.sms):
        SemanticModel(
            table=mtbl,
            name=f"sm-{i}",
            description="",
            version=1,
            data=sm,
        ).save()


def convert_linked_table(tbl: FullTable) -> Tuple[Table, List[TableRow]]:
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

    nrows, ncols = tbl.table.shape()
    links = {}
    for ri in range(nrows):
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
        name=tbl.table.table_id,
        description="",
        columns=columns,
        size=nrows,
        context_values=context_values,
        context_tree=[],
        context_page=context_page,
        project=None,
    )
    mrows = []

    for ri in range(nrows):
        row = [tbl.table[ri, ci] for ci in range(len(columns))]
        mrows.append(TableRow(table=mtbl, index=ri, row=row, links=links[ri]))

    return mtbl, mrows
