from dataclasses import dataclass
from typing import List


@dataclass
class SearchItem:
    """
    Search Item dataclass to save the values of each search item in a search
    """
    label: str
    id: str
    description: str
    uri: str

