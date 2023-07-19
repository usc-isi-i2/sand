from pathlib import Path
import pytest, os, uuid, shutil
from typing import List

from sand.models.base import db, init_db
from sand.models import all_tables
from werkzeug.datastructures import FileStorage
from sand.controllers.helpers.upload import (
    CSVParserOpts,
    UploadingTable,
    get_extension,
    parse_upload,
    save_upload,
)
import json


@pytest.fixture
def client():
    try:
        init_db(":memory:")
        db.create_tables(all_tables, safe=False)

        from sand.config import SETTINGS, _ROOT_DIR
        from sand.app import app

        app.config["TESTING"] = True

        with app.test_client() as client:
            yield client
    finally:
        db.drop_tables(all_tables)
        db.close()


@pytest.fixture
def load_kg_db(client):
    try:
        from sand.config import SETTINGS, _ROOT_DIR
        from kgdata.wikidata import db
        from kgdata.wikidata.models.wdentity import WDEntity
        from sm.misc.funcs import import_attr
        import os

        wikidata_path = _ROOT_DIR / "tests/resources/data/kgdb"

        with open(wikidata_path / "entities.jsonl") as entity_file:
            from kgdata.wikidata.models.wdentity import WDEntity
            entity_data = json.load(entity_file)
            wd_entity = WDEntity.from_dict(entity_data)
            entity_store = dict()
            entity_store[entity_data['id']] = wd_entity
            from sand.models.entity import ENTITY_AR
            from hugedict.chained_mapping import ChainedMapping
            ENTITY_AR = ChainedMapping(entity_store, import_attr(SETTINGS['entity']["default"]))

        with open(wikidata_path / "classes.jsonl") as class_file:
            from kgdata.wikidata.models.wdclass import WDClass
            class_data = json.load(class_file)
            wd_class = WDClass.from_dict(class_data)
            class_store = dict()
            class_store[entity_data['id']] = wd_class
            from sand.models.ontology import CLASS_AR
            from hugedict.chained_mapping import ChainedMapping
            CLASS_AR = ChainedMapping(class_store, import_attr(SETTINGS['ont_classes']["default"]))


        with open(wikidata_path / "props.jsonl") as props_file:
            from kgdata.wikidata.models.wdproperty import WDProperty
            props_data = json.load(props_file)
            wd_props = WDProperty.from_dict(props_data)
            props_store = dict()
            props_store[props_data['id']] = wd_props
            from sand.models.ontology import PROP_AR
            from hugedict.chained_mapping import ChainedMapping
            PROP_AR = ChainedMapping(props_store, import_attr(SETTINGS['ont_props']["default"]))

        yield None
    finally:
        pass



@pytest.fixture
def example_db(client):
    try:
        from sand.config import _ROOT_DIR

        project_post_data = {
            "name": "test_project",
            "description": "test project for unit tests"
        }
        resp = client.post('/api/project', json=project_post_data)
        project_id = resp.json['id']

        datafile_path = _ROOT_DIR / "tests/resources/data/dbload/highest_mountains_in_vn.csv"
        table_upload_data = {
            'file': open(datafile_path, 'rb'),
            'parser_opts': '{"file":{"delimiter":",","first_row_is_header":true,"format":"csv"}}',
            'selected_tables': '[0]'
        }
        client.post(f'/api/project/{project_id}/upload', data=table_upload_data, content_type='multipart/form'
                                                                                              '-data')

        semantic_file_path = _ROOT_DIR / "tests/resources/data/dbload/highest_mountains_in_vn_sematincmodel.json"
        semantic_model_data = json.load(open(semantic_file_path))
        client.post('/api/semanticmodel', json=semantic_model_data)

        yield None
    finally:
        for table in all_tables:
            table.truncate_table()
