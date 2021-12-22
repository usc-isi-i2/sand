import { Result } from "antd";
import { observer } from "mobx-react";
import React, { useEffect } from "react";
import { LoadingPage } from "rma-baseapp";
import { useStores } from "../../models";
import { Entity } from "./Entity";

export const FetchEntityComponent = observer(
  ({
    entityId,
    render,
    forceWaiting = false,
  }: {
    entityId: string;
    forceWaiting?: boolean;
    render: (entity: Entity) => React.ReactElement;
  }) => {
    const { entityStore } = useStores();

    useEffect(() => {
      entityStore.serializeFetchById(entityId);
    }, [entityStore, entityId]);

    const entity = entityStore.get(entityId);

    if (entity === undefined) {
      if (forceWaiting) {
        return <LoadingPage />;
      }

      return <span>{entityId}</span>;
    }

    if (entity === null) {
      return (
        <Result
          status="404"
          title="404"
          subTitle={`Entity ${entityId} does not exist`}
        />
      );
    }

    return render(entity);
  }
);
