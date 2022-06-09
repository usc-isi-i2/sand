from pathlib import Path
import pytest, os, uuid, shutil

from sand.models.base import init_db


@pytest.fixture()
def client():
    tempdir = Path("/tmp") / str(uuid.uuid4())

    try:
        tempdir.mkdir()
        shutil.copyfile(
            Path(__file__).parent / "resources/sand.db", str(Path(tempdir) / "sand.db")
        )
        init_db(str(Path(tempdir) / "sand.db"))

        from sand.app import app
        from sand.config import SETTINGS, _ROOT_DIR

        externaldb = _ROOT_DIR / "../data/home/databases"
        for cfg in SETTINGS.values():
            cfg["args"]["dbfile"] = os.path.join(
                externaldb, Path(cfg["args"]["dbfile"]).name
            )
            assert os.path.exists(cfg["args"]["dbfile"]), cfg["args"]["dbfile"]
            cfg["args"]["proxy"] = False

        app.config["TESTING"] = True
        with app.test_client() as client:
            yield client
    finally:
        if tempdir.exists():
            shutil.rmtree(tempdir, ignore_errors=True)
