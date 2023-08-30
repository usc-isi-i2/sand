from dataclasses import dataclass, InitVar
from typing import Optional, Union, List, Iterable, Literal
from typing_extensions import NotRequired, TypedDict


@dataclass
class Context:
    """ Context dataclass to access the row of the cell that is being transformed."""
    index: int
    row: list


@dataclass
class TransformRequestPayload:
    """Request Payload dataclass to validate the request obtained from the API call"""
    type: Literal["map", "filter", "split", "concatenate"]
    mode: str
    datapath: Union[str, List[str]]
    code: str
    tolerance: int
    rows: int
    outputpath: Optional[Union[str, List[str]]] = None


class Tdata(TypedDict):
    path: str
    value: str
    ok: NotRequired[Union[List, int, str, Iterable]]
    error: NotRequired[str]
