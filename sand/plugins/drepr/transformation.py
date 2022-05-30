from pathlib import Path

transdir = (Path(__file__).parent / "raw_transformations").absolute()

datatype2transformation = {
    "globe-coordinate": (transdir / "global_coordinate.py"),
    "quantity": (transdir / "number.py"),
}

loaded_transformations = {}


def get_transformation(datatype: str):
    global loaded_transformations
    if datatype not in loaded_transformations:
        loaded_transformations[datatype] = datatype2transformation[datatype].read_text()
    return loaded_transformations[datatype]


def has_transformation(datatype: str):
    return datatype in datatype2transformation
