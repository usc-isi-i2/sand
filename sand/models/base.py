import functools
from pathlib import Path
from typing import Any, Callable, Mapping, TypeVar, Union

from peewee import Field, Model, SqliteDatabase
from sand.config import CACHE_SIZE

# TODO: consider moving to APSWDatabase
db = SqliteDatabase(None)


def init_db(dbfile: Union[str, Path]):
    """Initialize database"""
    global db
    db.init(str(dbfile), pragmas={"foreign_keys": 1})


class BaseModel(Model):
    class Meta:
        database = db


class ClassField(Field):
    field_type = "BLOB"

    def __init__(self, cls, **kwargs):
        super().__init__(**kwargs)
        self.db_value = getattr(cls, "db_value")
        self.python_value = getattr(cls, "python_value")


class BlobField(Field):
    field_type = "BLOB"

    def __init__(self, serialize, deserialize, **kwargs):
        super().__init__(**kwargs)
        self.db_value = serialize
        self.python_value = deserialize


K = TypeVar("K")
V = TypeVar("V")


class StoreWrapper(Mapping[K, V]):
    def __init__(
        self,
        store: Mapping[K, V],
        key_deser: Callable[[K], Any],
        val_deser: Callable[[Any], V],
    ):
        self.store = store
        self.key_deser = key_deser
        self.val_deser = val_deser

    # @functools.lru_cache(maxsize=CACHE_SIZE)
    def __contains__(self, key):
        # print(key)
        # print(self.key_deser(key))
        return self.key_deser(key) in self.store

    # @functools.lru_cache(maxsize=CACHE_SIZE)
    def __getitem__(self, key):
        # print(key)
        # print(self.key_deser(key))
        val = self.store[self.key_deser(key)]
        return self.val_deser(val)

    def __setitem__(self, key, val):
        raise NotImplementedError(
            f"{self.__class__.__name__} does not support __setitem__ function"
        )

    def __delitem__(self, key):
        raise NotImplementedError(
            f"{self.__class__.__name__} does not support __delitem__ function"
        )

    def __len__(self):
        raise NotImplementedError(
            f"{self.__class__.__name__} does not support __len__ function"
        )

    def __iter__(self):
        raise NotImplementedError(
            f"{self.__class__.__name__} does not support __iter__ function"
        )

    def values(self):
        return (self.val_deser(v) for v in self.store.values())

    def get(self, key, default=None):
        if not self.__contains__(key):
            return default
        return self.__getitem__(key)
