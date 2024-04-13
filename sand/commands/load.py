from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Tuple

import click
from dependency_injector.wiring import Provide, inject
from sm.dataset import Dataset, Example, FullTable
from sm.misc.funcs import import_func
from sm.outputs.semantic_model import ClassNode, DataNode
from tqdm.auto import tqdm

from sand.container import use_container
from sand.helpers.dependency_injection import use_auto_inject
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
from sand.models.ontology import OntClassAR, OntPropertyAR


@click.command(name="load")
@click.option("-d", "--db", required=True, help="smc database file")
@click.option(
    "-c",
    "--config",
    help="Path to the configuration file",
)
@click.option("-p", "--project", default="default", help="Project name")
@click.option(
    "--dataset",
    required=True,
    help="Path to tables or a python function that returns the dataset in the following format: <python_func>::<dataset_name>",
)
@click.option(
    "-n",
    "--n-tables",
    default=-1,
    type=int,
    help="Number of tables to load (negative number or zero to load all)",
)
@click.option(
    "--add-missing-readable-label",
    is_flag=True,
    help="Attempt to add readable label for nodes and edges that don't have them",
)
def load_dataset(
    db: str,
    config: Optional[str],
    project: str,
    dataset: str,
    n_tables: int,
    add_missing_readable_label: bool,
):
    """Load a dataset into a project"""
    init_db(db)

    if dataset.find("::") != -1:
        func, dsquery = dataset.split("::")
        examples = import_func(func)(dsquery).load()
    else:
        examples = Dataset(Path(dataset)).load()

    if n_tables > 0:
        examples = examples[:n_tables]

    with use_container(config) as container:
        with use_auto_inject(container):
            import_examples(
                project,
                examples,
                add_missing_readable_label,
            )


@inject
def import_examples(
    project: str,
    examples: list[Example[FullTable]],
    add_missing_readable_label: bool,
    ontclass_ar: OntClassAR = Provide["classes"],
    ontprop_ar: OntPropertyAR = Provide["properties"],
):
    if add_missing_readable_label:
        for ex in tqdm(examples, "add missing readable labels"):
            for sm in ex.sms:
                for n in sm.iter_nodes():
                    if isinstance(n, ClassNode):
                        if n.readable_label is None:
                            n.readable_label = (
                                tmp.readable_label
                                if (tmp := ontclass_ar.get_by_uri(n.abs_uri))
                                is not None
                                else None
                            )
                for e in sm.iter_edges():
                    if e.readable_label is None:
                        if e.readable_label is None:
                            e.readable_label = (
                                tmp.readable_label
                                if (tmp := ontprop_ar.get_by_uri(e.abs_uri)) is not None
                                else None
                            )

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
        # make sure that the semantic model has all columns in the table
        newsm = sm.deep_copy()
        for col in example.table.table.columns:
            if not newsm.has_data_node(col.index):
                newsm.add_node(
                    DataNode(col_index=col.index, label=col.clean_multiline_name or "")
                )

        SemanticModel(
            table=mtbl,
            name=f"sm-{i}",
            description="",
            version=1,
            data=newsm,
        ).save()


def convert_linked_table(tbl: FullTable) -> Tuple[Table, List[TableRow]]:
    """Convert linked table to smc's tables and rows.
    Note that the project of the table is not set, which is supposed to be set later.
    """
    context_values = [
        Value("entityid", str(entityid)) for entityid in tbl.context.entities
    ]

    if tbl.context.page_url is not None:
        context_page = ContextPage(
            tbl.context.page_url,
            tbl.context.page_title or "",
            (str(tbl.context.entities[0]) if len(tbl.context.entities) > 0 else None),
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
