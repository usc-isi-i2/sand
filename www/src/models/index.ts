import React, { createContext } from "react";
import { message } from "antd";
import { registerDefaultAxiosErrorHandler } from "gena-app";
import { AssistantService } from "./AssistantService";
import { Entity, EntityStore } from "./entity";
import { ClassStore } from "./ontology/ClassStore";
import { PropertyStore } from "./ontology/PropertyStore";
import { Project, ProjectStore } from "./project";
import {
  DraftSemanticModel,
  SemanticModel,
  SemanticModelStore,
  SMGraph,
  URICount,
} from "./sm";
import { TableRowStore, TableStore } from "./table";
import { UISettings, EntitySettings, TableSettings } from "./settings";
import { toJS } from "mobx";

const tableStore = new TableStore();
const semanticModelStore = new SemanticModelStore();
const tableRowStore = new TableRowStore();
const classStore = new ClassStore();
const propertyStore = new PropertyStore();
const entityStore = new EntityStore();

export const stores = {
  projectStore: new ProjectStore(),
  tableStore,
  tableRowStore,
  semanticModelStore,
  entityStore,
  propertyStore,
  classStore,
  assistantService: new AssistantService(
    tableStore,
    tableRowStore,
    semanticModelStore,
    classStore,
    propertyStore,
    entityStore
  ),
  uiSettings: new UISettings(),
};

registerDefaultAxiosErrorHandler((error) => {
  message.error("Error while talking with the server.", 5);
});

(window as any)._stores = stores;
(window as any).toJS = toJS;
export type IStore = Readonly<typeof stores>;

/** Init the stores with essential information (e.g., loading the ui settings) needed to run the app */
export function initStores(): Promise<void> {
  return stores.uiSettings.fetchSettings();
}

export const StoreContext = createContext<IStore>(stores);

export function useStores(): IStore {
  return React.useContext(StoreContext);
}

export type { Property, DataType } from "./ontology/Property";
export type { SMEdge, SMNode } from "./sm/SMGraph";
export type { Table, TableRow } from "./table";
export {
  ProjectStore,
  TableStore,
  TableRowStore,
  Project,
  SemanticModelStore,
  DraftSemanticModel,
  PropertyStore,
  ClassStore,
  EntityStore,
  SemanticModel,
  SMGraph,
  URICount,
  Entity,
  UISettings,
  TableSettings,
  EntitySettings,
};
