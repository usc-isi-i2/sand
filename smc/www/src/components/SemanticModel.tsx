import { observer } from "mobx-react";
import { useEffect } from "react";
import { Table, useStores } from "../models";
import LoadingPage from "../pages/LoadingPage";
import GraphComponent from "./sm/Graph";

const SemanticModelComponent = observer(({ table }: { table: Table }) => {
  const { SemanticModelStore: semanticmodels } = useStores();

  useEffect(() => {
    semanticmodels.fetchSome({
      limit: 1000,
      offset: 0,
      conditions: {
        table: table.id,
      },
    });
  }, [table.id]);
  const sms = semanticmodels.findByTable(table.id);

  if (sms.length === 0) {
    return <LoadingPage bordered={true} />;
  }

  return (
    <div>
      <GraphComponent sm={sms[0]} />
    </div>
  );
});

export default SemanticModelComponent;
