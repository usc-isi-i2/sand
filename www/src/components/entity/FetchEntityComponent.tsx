import React, { useEffect, useState } from "react";
import { useStores } from "../../models";
import { Entity, IncompleteEntity } from "./Entity";

export const FetchEntityComponent = ({
  entityId,
  render,
}: {
  entityId: string;
  render: (entity: Entity | IncompleteEntity) => React.ReactElement;
}) => {
  // null means the entity is not yet loaded
  // undefined means the entity does not exist (to match with the find function)
  const [entity, setEntity] = useState<Entity | null | undefined>(null);
  const [isUnmount, setIsUnmount] = useState(false);

  const { entityStore } = useStores();

  useEffect(() => {
    const ent = entityStore.get(entityId);
    if (ent === undefined) {
      entityStore.fetch(entityId).then((entity) => {
        if (isUnmount) return;
        setEntity(entity);
      });
    }

    return () => {
      setIsUnmount(true);
    };
  }, [entityId]);

  if (entity === undefined || entity === null) {
    return render({
      id: entityId,
      doesNotExist: entity === undefined,
    });
  }

  return render(entity);
};
