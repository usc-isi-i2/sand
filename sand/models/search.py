from dataclasses import dataclass


@dataclass
class SearchResult:
    """
    Search Result dataclass to save the values of each search result in a search
    """
    label: str
    id: str
    description: str
    uri: str

