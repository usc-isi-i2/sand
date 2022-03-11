import { SERVER } from "../env";
import { RStore, Record } from "rma-baseapp";
import { action, flow, makeObservable, observable } from "mobx";
import { Table, TableRowStore, TableStore } from "./table";
import { DraftSemanticModel, SemanticModelStore } from "./sm";
import axios, { AxiosResponse } from "axios";
import { CancellablePromise } from "mobx/dist/api/flow";

interface AssistantRecord extends Record<number> {}

interface Prediction {
  [algorithm: string]: {
    sm: any;
    rows: any[];
  };
}

export class AssistantService extends RStore<number, AssistantRecord> {
  protected tables: TableStore;
  protected rows: TableRowStore;
  protected smStore: SemanticModelStore;

  constructor(
    tableStore: TableStore,
    tableRowStore: TableRowStore,
    smStore: SemanticModelStore
  ) {
    super(`${SERVER}/api/assistant`, undefined, false, []);

    this.tables = tableStore;
    this.rows = tableRowStore;
    this.smStore = smStore;

    makeObservable(this, {
      predict: action,
    });
  }

  /**
   * Predict
   * */
  predict: (table: Table) => CancellablePromise<void> = flow(function* (
    this: AssistantService,
    table: Table
  ) {
    // send request to the server to get some suggestions
    let resp: AxiosResponse<Prediction>;

    try {
      this.state.value = "updating";
      resp = yield axios.get(`${this.remoteURL}/predict/${table.id}`, {
        params: { algorithm: "mtab" },
      });
      this.state.value = "updated";
    } catch (error: any) {
      this.state.value = "error";
      this.ajaxErrorHandler(error);
      throw error;
    }

    // deserialzie the results and put it back to the store
    const rawsm = resp.data.mtab.sm;
    const rawrows = resp.data.mtab.rows;

    const draftId = this.smStore.getNewCreateDraftId(table);
    const graph = this.smStore.deserialize({
      data: rawsm,
      id: "",
    }).graph;

    // before set a new draft, check if an empty draft is there (as default) and remove it
    const prevDrafts = this.smStore.getCreateDraftsByTable(table);
    if (prevDrafts.length === 1 && prevDrafts[0].graph.isEmpty()) {
      this.smStore.deleteCreateDraft(prevDrafts[0].draftID);
    }

    const name = this.smStore.getNewSemanticModelName(table);
    this.smStore.setCreateDraft(
      new DraftSemanticModel(draftId, name, "", 0, graph, table.id)
    );

    const rows = rawrows.map(this.rows.deserialize);
    for (const row of rows) {
      this.rows.set(row);
    }
    return;
  });
}
