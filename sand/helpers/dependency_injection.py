from __future__ import annotations

import functools
from contextlib import contextmanager
from inspect import signature

from dependency_injector import containers
from dependency_injector.wiring import Provide, ProvidersMap
from loguru import logger

CURRENT_APP_CONTAINER: containers.Container | None = None
CURRENT_APP_PROVIDER_MAP: ProvidersMap | None = None


@contextmanager
def use_auto_inject(container: containers.Container):
    global CURRENT_APP_PROVIDER_MAP, CURRENT_APP_CONTAINER

    CURRENT_APP_CONTAINER = container
    CURRENT_APP_PROVIDER_MAP = ProvidersMap(container)

    yield None

    CURRENT_APP_CONTAINER = None
    CURRENT_APP_PROVIDER_MAP = None


def autoinject(func):
    inject_args: list[tuple[int, str, Provide]] = []

    for i, (name, param) in enumerate(signature(func).parameters.items()):
        if isinstance(param.default, Provide):
            inject_args.append((i, name, param.default))

    if len(inject_args) == 0:
        logger.error(
            "Function {} does not have any arguments with default values of Provide[X]"
            "Hence, no need to inject anything.",
            func.__qualname__,
        )
        raise Exception("no dependencies to inject")

    @functools.wraps(func)
    def fn(*args, **kwargs):
        if CURRENT_APP_PROVIDER_MAP is None:
            raise Exception(
                "Auto injection must be initialized using `use_autoinject` first"
            )

        for argidx, argname, provider in inject_args:
            if argidx < len(args) or argname in kwargs:
                continue
            prov = CURRENT_APP_PROVIDER_MAP.resolve_provider(
                provider.provider, provider.modifier
            )
            assert prov is not None
            kwargs[argname] = prov()
        return func(*args, **kwargs)

    return fn
