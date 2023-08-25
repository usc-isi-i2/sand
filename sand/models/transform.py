from dataclasses import dataclass


@dataclass
class Context:
    """ Context dataclass to access the row of the cell that is being transformed."""
    index: int
    row: list

