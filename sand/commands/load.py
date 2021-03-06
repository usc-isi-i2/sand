import glob
import os
from pathlib import Path

import click
from tqdm.auto import tqdm
from loguru import logger
from sand.models import (
    Project,
    SemanticModel,
    db as dbconn,
    init_db,
)
from sand.plugins.grams_plugin import convert_linked_table
from sm.dataset import Example, load as sm_load
from grams.inputs import LinkedTable


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

    examples = sm_load(dataset, table_deser=LinkedTable.from_dict)
    if n_tables > 0:
        examples = examples[:n_tables]

    with dbconn:
        p = Project.get(name=project)
        for e in tqdm(examples, desc="Loading examples"):
            save_example(p, e)


def save_example(project: Project, example: Example[LinkedTable]):
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
