import { observer } from "mobx-react";
import React, { useEffect } from "react";
import { useStores } from "../../models";
import { Entity, IncompleteEntity } from "./Entity";

export const FetchEntityComponent = observer(
  ({
    entityId,
    render,
  }: {
    entityId: string;
    render: (entity: Entity | IncompleteEntity) => React.ReactElement;
  }) => {
    const { entityStore } = useStores();

    useEffect(() => {
      entityStore.serializeFetchById(entityId);
    }, [entityStore, entityId]);

    const entity = entityStore.get(entityId);
    if (entity === undefined || entity === null) {
      return render({
        id: entityId,
        doesNotExist: entity === null,
      });
    }

    return render(entity);
  }
);
