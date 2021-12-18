from pathlib import Path
import pytest, os, tempfile, shutil


@pytest.fixture()
def client():
    with tempfile.TemporaryDirectory() as tempdir:
        tempdir = "/tmp/test"
        shutil.copyfile(
            Path(__file__).parent / "resources/smc.db", str(Path(tempdir) / "smc.db")
        )
        os.environ["DBFILE"] = str(Path(tempdir) / "smc.db")

    from smc.api import app
    from smc.config import DAO_SETTINGS, _ROOT_DIR

    externaldb = _ROOT_DIR / "../data/home/databases"
    for cfg in DAO_SETTINGS.values():
        cfg["args"]["dbfile"] = os.path.join(
            externaldb, Path(cfg["args"]["dbfile"]).name
        )
        assert os.path.exists(cfg["args"]["dbfile"]), cfg["args"]["dbfile"]
        cfg["args"]["proxy"] = False

    with app.test_client() as client:
        yield client
