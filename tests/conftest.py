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

        externaldb = _ROOT_DIR / "tests/resources/data/databases"

        filtered_setings = {k: v for k, v in SETTINGS.items() if k in ['entity', 'ont_classes', 'ont_props']}
        for cfg in filtered_setings.values():
            cfg["args"]["dbfile"] = os.path.join(
                externaldb, Path(cfg["args"]["dbfile"]).name
            )
            assert os.path.exists(cfg["args"]["dbfile"]), cfg["args"]["dbfile"]
            cfg["args"]["proxy"] = False

        app.config["TESTING"] = True

        with app.test_client() as client:
            yield client
    finally:
        db.drop_tables(all_tables)
        db.close()


@pytest.fixture
def load_db(client):
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
