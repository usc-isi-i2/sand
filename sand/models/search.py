from dataclasses import dataclass
from typing import List
from gena.serializer import get_dataclass_serializer


@dataclass
class SearchItem:
    """
    Search Item dataclass to save the values of each search item in a search
    """
    label: str
    id: str
    description: str
    uri: str


@dataclass
class SearchPayload:
    """
        Search Payload dataclass to hold several search items
    """
    items: List[SearchItem]

