import { SERVER } from "../env";
import { Record, RStore } from "./base";
import { PairKeysUniqueIndex, SingleKeyIndex } from "./base/StoreIndex";

export interface Table extends Record<number> {
  name: string;
  description: string;
  columns: string[];
  project: number;
  size: number;
  contextPage: { url: string; title: string } | null;
}

export interface Link {
  start: number;
  end: number;
  url: string;
  entity?: string;
  candidateEntities: { uri: string; probability: number }[];
}

export interface TableRow extends Record<number> {
  table: number;
  index: number;
  row: (string | number)[];
  links: Map<number, Link[]>;
}

export class TableStore extends RStore<number, Table> {
  protected projectIndex: SingleKeyIndex<number, number> = new SingleKeyIndex(
    "project"
  );

  constructor() {
    super(`${SERVER}/api/table`);
  }

  findByProject = (projectId: number, start?: number, no?: number): Table[] => {
    return (this.projectIndex.index.get(projectId) || []).map(
      (id) => this.records.get(id)!
    );
  };

  public deserialize(record: any): Table {
    record.contextPage = record.context_page;
    delete record.context_page;
    return record;
  }

  protected index(record: Table) {
    this.projectIndex.index_record(record);
  }
}

export class TableRowStore extends RStore<number, TableRow> {
  protected tableIndex: PairKeysUniqueIndex<number, number, number> =
    new PairKeysUniqueIndex("table", "index");

  constructor() {
    super(`${SERVER}/api/tablerow`);
  }

  findByTable = (tableId: number, start: number, no: number): TableRow[] => {
    const map = this.tableIndex.index.get(tableId);
    if (map === undefined) return [];

    const output = [];
    for (let i = 0; i < no; i++) {
      const rowId = map.get(i + start);
      if (rowId === undefined) {
        break;
      }
      output.push(this.records.get(rowId)!);
    }
    return output;
  };

  protected index(record: TableRow) {
    this.tableIndex.index_record(record);
  }

  public deserialize(record: any): TableRow {
    const mlinks = new Map();
    for (const [ci, links] of Object.entries(record.links)) {
      (links as any).forEach((link: any) => {
        link.candidateEntities = link.candidate_entities;
        delete link.candidate_entities;
      });
      mlinks.set(parseInt(ci), links);
    }
    record.links = mlinks;
    return record;
  }
}
