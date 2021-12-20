import { SERVER } from "../../env";
import {
  Record,
  CRUDStore,
  RStore,
  DraftUpdateRecord,
  DraftCreateRecord,
  SingleKeyIndex,
} from "rma-baseapp";
import { SMGraph, SMNodeType } from "./SMGraph";

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
  graph: SMGraph;
  table: number;
  project: number;

  constructor(
    id: string,
    description: string,
    version: number,
    graph: SMGraph,
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
    graph: SMGraph,
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

  /**
   * Find semantic models of the given table.
   */
  public findByTable(tableId: number): SemanticModel[] {
    return Array.from(this.tableIndex.index.get(tableId) || []).map(
      (id) => this.records.get(id)!
    );
  }

  /** Whether we have local copies of semantic models of a given table */
  public hasByTable(tableId: number): boolean {
    return this.tableIndex.index.has(tableId);
  }

  public deserialize(record: any): SemanticModel {
    let id = getKey(record.name, record.table);
    let nodes = record.data.nodes.map((node: any) => {
      const type: SMNodeType = node.type;
      delete node.type;
      node.nodetype = type;
      if (type === "data_node") {
        node.columnIndex = node.column_index;
        delete node.column_index;
      } else if (type === "literal_node") {
        node.isInContext = node.is_in_context;
        delete node.is_in_context;
      }
      return node;
    });
    let graph = new SMGraph(id, nodes, record.data.edges);
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
    this.tableIndex.add(record);
  }
}
