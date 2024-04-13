from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

from dependency_injector import containers, providers
from sm.misc.funcs import import_func

from sand.config import PACKAGE_DIR, AppConfig
from sand.helpers.namespace import NamespaceService
from sand.helpers.service_provider import MultiServiceProvider, get_service
from sand.models.entity import EntityAR, get_default_entities
from sand.models.ontology import (
    OntClassAR,
    OntPropertyAR,
    get_default_classes,
    get_default_properties,
)


class AppContainer(containers.DeclarativeContainer):
    basecfg = providers.Configuration()

    # app configuration
    appcfg = providers.Singleton(AppConfig.from_yaml, basecfg.config_file)

    # namespace service
    namespace = providers.Singleton(NamespaceService)

    # KG databases
    entities = providers.Singleton(EntityAR.init)
    classes = providers.Singleton(OntClassAR.init)
    properties = providers.Singleton(OntPropertyAR.init)

    default_entities = providers.Singleton(get_default_entities)
    default_classes = providers.Singleton(get_default_classes)
    default_properties = providers.Singleton(get_default_properties)

    assistant = providers.Singleton(MultiServiceProvider, cfg=appcfg.provided.assistant)
    export = providers.Singleton(MultiServiceProvider, cfg=appcfg.provided.export)
    entity_search = providers.Singleton(get_service, path=appcfg.provided.search.entity)
    ontology_search = providers.Singleton(
        get_service, path=appcfg.provided.search.ontology
    )


@contextmanager
def use_container(config_file: Optional[Path | str] = None):
    container = AppContainer()
    container.basecfg.from_dict(
        {
            "config_file": str(
                config_file or os.path.join(PACKAGE_DIR, "config.default.yml")
            )
        }
    )
    try:
        container.wire(
            packages=[
                "sand.controllers",
                "sand.models",
                "sand.extensions.assistants",
                "sand.extensions.search",
                "sand.deserializer",
                "sand.serializer",
                "sand.helpers",
                "sand.app",
                "sand.commands.load",
            ],
            modules=["sand.extensions.export.drepr.main"],
        )
        yield container
    finally:
        container.unwire()
