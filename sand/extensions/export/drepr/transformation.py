from pathlib import Path
from typing import Mapping

from sand.models.ontology import OntPropertyDataType

transdir = (Path(__file__).parent / "raw_transformations").absolute()

datatype2transformation: Mapping[OntPropertyDataType, Path] = {
    "globe-coordinate": (transdir / "global_coordinate.py"),
    "number": (transdir / "number.py"),
}

loaded_transformations: Mapping[OntPropertyDataType, str] = {}


def get_transformation(datatype: OntPropertyDataType):
    global loaded_transformations
    if datatype not in loaded_transformations:
        loaded_transformations[datatype] = datatype2transformation[datatype].read_text()
    return loaded_transformations[datatype]


def has_transformation(datatype: OntPropertyDataType):
    return datatype in datatype2transformation
