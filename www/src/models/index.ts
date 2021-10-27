import { Project, ProjectStore } from "./Project";
import { createContext } from "react";

import React from "react";
import { TableRowStore, TableStore } from "./Table";
import { SemanticModelStore } from "./sm/SemanticModelStore";
import { Graph, URICount } from "./sm/Graph";

export const stores = {
  projectStore: new ProjectStore(),
  tableStore: new TableStore(),
  tableRowStore: new TableRowStore(),
  semanticModelStore: new SemanticModelStore(),
};
(window as any)._stores = stores;
export type IStore = Readonly<typeof stores>;

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
