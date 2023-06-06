from dataclasses import dataclass


@dataclass
class SearchResult:
    """
    Search Item dataclass to save the values of each search item in a search
    """
    label: str
    id: str
    description: str
    uri: str

