import { Result } from "antd";
import { observer } from "mobx-react";
import React, { useEffect } from "react";
import { LoadingPage } from "rma-baseapp";
import { useStores } from "../../models";
import { EntitySettings } from "../../models/entity";
import { Entity } from "./Entity";

export const FetchEntityComponent = observer(
  ({
    entityId,
    render,
    renderLoading,
    renderNotFound,
    forceWaiting = false,
  }: {
    entityId: string;
    forceWaiting?: boolean;
    render: (entity: Entity, settings: EntitySettings) => React.ReactElement;
    renderLoading?: () => React.ReactElement;
    renderNotFound?: () => React.ReactElement;
  }) => {
    const { entityStore } = useStores();

    useEffect(() => {
      entityStore.batch.fetchById(entityId);
    }, [entityStore, entityId]);

    const entity = entityStore.get(entityId);

    if (entity === undefined) {
      if (forceWaiting) {
        if (renderLoading !== undefined) {
          return renderLoading();
        }
        return <LoadingPage />;
      }

      return <span>{entityId}</span>;
    }

    if (entity === null) {
      if (renderNotFound !== undefined) {
        return renderNotFound();
      }

      return (
        <Result
          status="404"
          title="404"
          subTitle={`Entity ${entityId} does not exist`}
        />
      );
    }

    return render(entity, entityStore.settings);
  }
);
