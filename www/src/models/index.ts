import { message } from "antd";
import { AxiosError } from "axios";
import { Project, ProjectStore } from "./Project";
import { createContext } from "react";

import React from "react";
import { TableRowStore, TableStore } from "./Table";
import { SemanticModelStore } from "./sm/SemanticModelStore";
import { Graph, URICount } from "./sm/Graph";

const projects = new ProjectStore();
const tables = new TableStore();
const tablerows = new TableRowStore();
const semanticmodels = new SemanticModelStore();

export const stores = {
  ProjectStore: projects,
  TableStore: tables,
  TableRowStore: tablerows,
  SemanticModelStore: semanticmodels,
};
(window as any)._stores = stores;
export type IStore = Readonly<typeof stores>;

function ajaxErrorHandler(error: AxiosError<any>) {
  message.error(
    "Error while talking with the server. Check console for more details.",
    10
  );
  console.error(error);
}

for (let store of Object.values(stores)) {
  store.ajaxErrorHandler = ajaxErrorHandler;
}

export const StoreContext = createContext<IStore>(stores);

export function useStores(): IStore {
  return React.useContext(StoreContext);
}

export {
  ProjectStore,
  TableStore,
  TableRowStore,
  Project,
  SemanticModelStore,
  Graph,
  URICount,
};
export type { Table, TableRow } from "./Table";
export type { SemanticModel } from "./sm/SemanticModelStore";
export type { GraphEdge, GraphNode } from "./sm/Graph";
