from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Iterator, Mapping

from sm.outputs.semantic_model import SemanticModel


@dataclass
class ElementLocator:
    pass


@dataclass
class Resource:
    id: str = field(
        metadata={
            "help": "Resource's ID",
        }
    )


@dataclass
class Attribute:
    id: str = field(
        metadata={
            "help": "Attribute's ID",
        }
    )
    location: ElementLocator = field(
        metadata={
            "help": "Location of the attribute",
        }
    )


AttrElement = str | int | float | bool | None


@dataclass
class Transformation:
    pass


@dataclass
class AttributeJoin:
    pass


@dataclass
class DRepr:
    resources: Mapping[str, Resource] = field(
        metadata={
            "help": "A mapping from resource's ID to the resource",
        }
    )
    attributes: Mapping[str, Attribute] = field(
        metadata={
            "help": "A mapping from attribute's ID to the attribute",
        }
    )
    transformations: list[Transformation] = field(
        metadata={
            "help": "A list of transformations applied to the data",
        }
    )
    attribute_joins: list[AttributeJoin] = field(
        metadata={
            "help": "A list of join functions",
        }
    )
    semantic_model: SemanticModel = field(
        metadata={
            "help": "Normalized schema of the dataset",
        }
    )


@dataclass
class DatasetManager(ABC):
    data_repr: DRepr

    @abstractmethod
    def iter_records(
        self, resource_id: str, limit: str
    ) -> Iterator[dict[str, AttrElement]]:
        """Iterate over records of a resource

        Args:
            resource_id: ID of the resource
            limit: maximum number of records to iterate
        """
        pass

    @abstractmethod
    def iter_attribute_elements(
        self, attribute_id: str, limit: int
    ) -> Iterator[AttrElement]:
        """iterate over elements of an attribute. Note that an attribute of a record can contain multiple elements (e.g., similar to
        a column in a table where its type is a list -- aka each cell contains a list of elements), but this function will not
        yield list of elements, instead it yields each element individually.

        Args:
            attribute_id: ID of the attribute
            limit: maximum number of elements to read
        """
        pass

    @abstractmethod
    def test_map_fn(self, transformation: Transformation, limit: int):
        """Test a mapping transformation and return the result"""
        pass

    @abstractmethod
    def test_filter_fn(self, transformation: Transformation, limit: int):
        """Test a filter transformation and return the result"""
        pass

    @abstractmethod
    def test_split_fn(self, transformation: Transformation, limit: int):
        pass

    @abstractmethod
    def gen_exec(self) -> str:
        pass

    def exec(self) -> str:
        pass
