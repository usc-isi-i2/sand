import { Project, ProjectStore } from "./Project";
import { createContext } from "react";

import React from "react";
import { TableStore, TableRowStore } from "./table";
import { SMGraph, URICount, SemanticModelStore } from "./sm";
import { Entity, EntityStore } from "./entity";

export const stores = {
  projectStore: new ProjectStore(),
  tableStore: new TableStore(),
  tableRowStore: new TableRowStore(),
  semanticModelStore: new SemanticModelStore(),
  entityStore: new EntityStore(),
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
  SMGraph,
  URICount,
  Entity,
};
export type { Table, TableRow } from "./table";
export type { SemanticModel } from "./sm/SemanticModelStore";
export type { GraphEdge, SMNode as GraphNode } from "./sm/SMGraph";
