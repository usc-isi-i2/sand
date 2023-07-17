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


@dataclass
class WikidataError:
    code: str
    info: str

@dataclass
class WikidataAPIError:
    error: WikidataError
    servedby: str

