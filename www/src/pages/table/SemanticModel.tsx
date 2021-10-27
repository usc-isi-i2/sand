import { observer } from "mobx-react";
import { useEffect } from "react";
import { Table, useStores } from "../../models";
import { LoadingPage } from "rma-baseapp";
import { GraphComponent } from "./sm/Graph";

export const SemanticModelComponent = observer(
  ({ table }: { table: Table }) => {
    const { semanticModelStore } = useStores();

    useEffect(() => {
      semanticModelStore.fetchSome({
        limit: 1000,
        offset: 0,
        conditions: {
          table: table.id,
        },
      });
    }, [table.id]);
    const sms = semanticModelStore.findByTable(table.id);

    if (sms.length === 0) {
      return <LoadingPage bordered={true} />;
    }

    return (
      <div>
        <GraphComponent sm={sms[0]} />
      </div>
    );
  }
);
