import json
import os
from pathlib import Path

import pytest
from sand.extensions.wikidata import (
    get_wdclass_id,
    get_wdprop_id,
    identity,
    ont_class_deser,
    ont_prop_deser,
    qnode_deser,
)
from sand.models import all_tables
from sand.models.base import StoreWrapper, db, init_db


def get_entity_db(dbfile, proxy=False) -> StoreWrapper:
    from kgdata.wikidata.models.wdentity import WDEntity

    with open(dbfile) as dbfile_fp:
        entity_store = dict()
        for line in dbfile_fp:
            entity_data = json.loads(line.strip())  # fix multiple load
            wd_entity = WDEntity.from_dict(entity_data)
            entity_store[entity_data["id"]] = wd_entity
        return StoreWrapper(
            entity_store,
            key_deser=identity,
            val_deser=qnode_deser,
        )


def get_ontclass_db(dbfile, proxy=False) -> StoreWrapper:
    from kgdata.wikidata.models.wdclass import WDClass

    with open(dbfile) as dbfile_fp:
        class_store = dict()
        for line in dbfile_fp:
            class_data = json.loads(line.strip())
            wd_class = WDClass.from_dict(class_data)
            class_store[class_data["id"]] = wd_class
        return StoreWrapper(
            class_store,
            key_deser=get_wdclass_id,
            val_deser=ont_class_deser,
        )


def get_ontprops_db(dbfile, proxy=False) -> StoreWrapper:
    from kgdata.wikidata.models.wdproperty import WDProperty

    with open(dbfile) as dbfile_fp:
        props_store = dict()
        for line in dbfile_fp:
            props_data = json.loads(line.strip())
            wd_props = WDProperty.from_dict(props_data)
            props_store[props_data["id"]] = wd_props
        return StoreWrapper(
            props_store,
            key_deser=get_wdprop_id,
            val_deser=ont_prop_deser,
        )


@pytest.fixture
def client():
    try:
        init_db(":memory:")
        db.create_tables(all_tables, safe=False)

        import sys

        from sand.config import _ROOT_DIR, AppConfig

        if _ROOT_DIR not in sys.path:
            sys.path.append(str(_ROOT_DIR))

        cfg = AppConfig.from_yaml(_ROOT_DIR / "tests/resources/config.test.yml")
        from sand.app import App

        app = App(cfg).get_flask_app()

        app.config["TESTING"] = True
        with app.test_client() as client:
            yield client
    finally:
        import sys

        from sand.config import _ROOT_DIR

        sys.path.remove(str(_ROOT_DIR))
        db.drop_tables(all_tables)
        db.close()


@pytest.fixture
def example_db(client):
    try:
        from sand.config import _ROOT_DIR

        project_post_data = {
            "name": "test_project",
            "description": "test project for unit tests",
        }
        resp = client.post("/api/project", json=project_post_data)
        project_id = resp.json["id"]

        datafile_path = (
            _ROOT_DIR / "tests/resources/data/dbload/highest_mountains_in_vn.csv"
        )
        table_upload_data = {
            "file": open(datafile_path, "rb"),
            "parser_opts": '{"file":{"delimiter":",","first_row_is_header":true,"format":"csv"}}',
            "selected_tables": "[0]",
        }
        client.post(
            f"/api/project/{project_id}/upload",
            data=table_upload_data,
            content_type="multipart/form" "-data",
        )

        semantic_file_path = (
            _ROOT_DIR
            / "tests/resources/data/dbload/highest_mountains_in_vn_sematincmodel.json"
        )
        semantic_model_data = json.load(open(semantic_file_path))
        client.post("/api/semanticmodel", json=semantic_model_data)

        yield None
    finally:
        for table in all_tables:
            table.truncate_table()
