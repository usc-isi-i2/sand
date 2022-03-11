import { Project, ProjectStore } from "./project";
import { createContext } from "react";

import React from "react";
import { TableStore, TableRowStore } from "./table";
import {
  DraftSemanticModel,
  SemanticModel,
  SMGraph,
  URICount,
  SemanticModelStore,
  SMNode,
} from "./sm";
import { Entity, EntityStore } from "./entity";
import { PropertyStore } from "./ontology/PropertyStore";
import { ClassStore } from "./ontology/ClassStore";
import { AssistantService } from "./AssistantService";

const tableStore = new TableStore();
const semanticModelStore = new SemanticModelStore();
const tableRowStore = new TableRowStore();

export const stores = {
  projectStore: new ProjectStore(),
  tableStore,
  tableRowStore,
  semanticModelStore,
  entityStore: new EntityStore(),
  propertyStore: new PropertyStore(),
  classStore: new ClassStore(),
  assistantService: new AssistantService(
    tableStore,
    tableRowStore,
    semanticModelStore
  ),
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
  DraftSemanticModel,
  PropertyStore,
  ClassStore,
  SemanticModel,
  SMGraph,
  URICount,
  Entity,
};
export type { Property } from "./ontology/PropertyStore";
export type { Table, TableRow } from "./table";
export type { SMEdge, SMNode } from "./sm/SMGraph";
