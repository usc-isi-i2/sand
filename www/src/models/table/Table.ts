import { Record } from "rma-baseapp";
import { DataValue } from "../entity/Entity";
import { ContentHierarchy } from "./TableContext";

export interface Table extends Record<number> {
  name: string;
  description: string;
  columns: string[];
  project: number;
  size: number;
  contextPage: { url: string; title: string; entityId: string } | null;
  contextValues: DataValue[];
  contextTree: ContentHierarchy[];
}

export interface TableRow extends Record<number> {
  table: number;
  index: number;
  row: (string | number)[];
  links: { [columnIndex: string | number]: Link[] };
}

export interface Link {
  start: number;
  end: number;
  url: string;
  entityId?: string;
  candidateEntities: { entityId: string; probability: number }[];
}
