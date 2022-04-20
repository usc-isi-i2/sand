import { makeObservable, observable } from "mobx";
import { Record } from "gena-app";
import { DataValue } from "../entity/Entity";
import { ContentHierarchy } from "./TableContext";

export interface Table extends Record<number> {
  name: string;
  description: string;
  columns: string[];
  project: number;
  size: number;
  contextPage: { url?: string; title?: string; entityId?: string };
  contextValues: DataValue[];
  contextHierarchy: ContentHierarchy[];
}

export class TableRow implements Record<number> {
  id: number;
  table: number;
  index: number;
  row: (string | number)[];
  links: { [columnIndex: string | number]: Link[] };

  public constructor(
    id: number,
    table: number,
    index: number,
    row: string[],
    links: { [columnIndex: string | number]: Link[] }
  ) {
    this.id = id;
    this.table = table;
    this.index = index;
    this.row = row;
    this.links = links;

    makeObservable(this, {
      id: observable,
      table: observable,
      index: observable,
      row: observable,
      links: observable,
    });
  }
}

export interface Link {
  start: number;
  end: number;
  // undefined when it's not mapped, NIL_ENTITY when associated entity is absent
  url?: string;
  entityId?: string;
  candidateEntities: { entityId: string; probability: number }[];
}
