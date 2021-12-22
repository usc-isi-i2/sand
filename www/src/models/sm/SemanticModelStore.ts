import {
  CRUDStore,
  DraftCreateRecord,
  DraftUpdateRecord,
  Record,
  SingleKeyIndex,
} from "rma-baseapp";
import { SERVER } from "../../env";
import { SMGraph, SMNodeType } from "./SMGraph";

export class SemanticModel
  implements Record<number>, DraftUpdateRecord<number, SemanticModel>
{
  id: number;
  name: string;
  description: string;
  version: number;
  graph: SMGraph;
  table: number;

  constructor(
    id: number,
    name: string,
    description: string,
    version: number,
    graph: SMGraph,
    table: number
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.version = version;
    this.graph = graph;
    this.table = table;
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
    name: string,
    description: string,
    version: number,
    graph: SMGraph,
    table: number
  ) {
    super(-1, name, description, version, graph, table);
    this.draftID = draftID;
  }

  get isDraft() {
    return true;
  }
}

export class SemanticModelStore extends CRUDStore<
  number,
  DraftSemanticModel,
  SemanticModel,
  SemanticModel
> {
  protected tableIndex: SingleKeyIndex<number, number> = new SingleKeyIndex(
    "table"
  );

  constructor() {
    super(`${SERVER}/api/semanticmodel`, undefined, false);
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
    let graph = new SMGraph(record.id.toString(), nodes, record.data.edges);
    return new SemanticModel(
      record.id,
      record.name,
      record.description,
      record.version,
      graph,
      record.table
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
