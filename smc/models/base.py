import functools
from typing import TypeVar, Type, Callable, Any

import orjson
from peewee import SqliteDatabase, Model, Field

from smc.config import DBFILE, CACHE_SIZE


T = TypeVar("T", bound="Singleton")


db = SqliteDatabase(DBFILE)


class BaseModel(Model):
    class Meta:
        database = db


class BlobField(Field):
    field_type = "blob"

    def __init__(self, serialize, deserialize, **kwargs):
        super().__init__(**kwargs)
        self.db_value = serialize
        self.python_value = deserialize


class Singleton:
    instance = None

    @classmethod
    def get_instance(cls: Type[T]) -> T:
        if cls.instance is None:
            cls.instance = cls()
        return cls.instance


K = TypeVar("K")
V = TypeVar("V")


class StoreWrapper:
    def __init__(self, store: dict, key_deser: Callable[[K], Any], val_deser: Callable[[Any], V]):
        self.store = store
        self.key_deser = key_deser
        self.val_deser = val_deser

    @functools.lru_cache(maxsize=CACHE_SIZE)
    def __contains__(self, key):
        return self.key_deser(key) in self.store

    @functools.lru_cache(maxsize=CACHE_SIZE)
    def __getitem__(self, key):
        val = self.store[self.key_deser(key)]
        return self.val_deser(val)

    def __setitem__(self, key, val):
        raise NotImplementedError(f"{self.__class__.__name__} does not support __setitem__ function")

    def __delitem__(self, key):
        raise NotImplementedError(f"{self.__class__.__name__} does not support __delitem__ function")

    def __len__(self):
        raise NotImplementedError(f"{self.__class__.__name__} does not support __len__ function")

    def get(self, key, default=None):
        if not self.__contains__(key):
            return default
        return self.__getitem__(key)
