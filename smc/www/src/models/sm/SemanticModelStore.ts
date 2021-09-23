import { SERVER } from "../../env";
import {
  Record,
  CRUDStore,
  RStore,
  DraftUpdateRecord,
  DraftCreateRecord,
} from "../base";
import { SingleKeyIndex } from "../base/StoreIndex";
import { Graph } from "./Graph";

// id of a semantic model is actually the combination of table & name
const parseKey = (id: string) => {
  const ptr = id.indexOf(":");
  return { table: parseInt(id.substring(0, ptr)), name: id.substring(ptr) };
};
const getKey = (name: string, table: number) => `${table}:${name}`;

export class SemanticModel
  implements Record<string>, DraftUpdateRecord<string, SemanticModel>
{
  id: string;
  description: string;
  version: number;
  graph: Graph;
  table: number;
  project: number;

  constructor(
    id: string,
    description: string,
    version: number,
    graph: Graph,
    table: number,
    project: number
  ) {
    this.id = id;
    this.description = description;
    this.version = version;
    this.graph = graph;
    this.table = table;
    this.project = project;
  }

  get isDraft() {
    return false;
  }

  markSaved(): void {
    this.graph.onSave();
  }

  toModel(): SemanticModel | undefined {
    return this;
  }
}

export class DraftSemanticModel
  extends SemanticModel
  implements DraftCreateRecord
{
  draftID: string;

  constructor(
    draftID: string,
    description: string,
    version: number,
    graph: Graph,
    table: number,
    project: number
  ) {
    super(draftID, description, version, graph, table, project);
    this.draftID = draftID;
  }

  get isDraft() {
    return true;
  }
}

export class SemanticModelStore extends CRUDStore<
  string,
  DraftSemanticModel,
  SemanticModel,
  SemanticModel
> {
  protected tableIndex: SingleKeyIndex<string, number> = new SingleKeyIndex(
    "table"
  );

  constructor() {
    super(`${SERVER}/api/semanticmodel`);
  }

  public findByTable(tableId: number): SemanticModel[] {
    return (this.tableIndex.index.get(tableId) || []).map(
      (id) => this.records.get(id)!
    );
  }

  public deserialize(record: any): SemanticModel {
    let id = getKey(record.name, record.table);
    let graph = new Graph(id, record.data.nodes, record.data.edges);
    return new SemanticModel(
      id,
      record.description,
      record.version,
      graph,
      record.table,
      record.project
    );
  }

  public serializeUpdateDraft(record: any): object {
    throw new Error("Method not implemented.");
  }

  public serializeCreateDraft(record: DraftSemanticModel): object {
    throw new Error("Method not implemented.");
  }

  protected index(record: SemanticModel): void {
    this.tableIndex.index_record(record);
  }
}
