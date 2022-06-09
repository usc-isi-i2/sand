import {
  CRUDStore,
  DraftCreateRecord,
  DraftUpdateRecord,
  Record,
  SingleKeyIndex,
} from "gena-app";
import { SERVER } from "../../env";
import { Table } from "../table";
import { SMEdge, SMGraph, SMNode, SMNodeType } from "./SMGraph";

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

  static isDraft = (
    sm: SemanticModel | DraftSemanticModel
  ): sm is DraftSemanticModel => {
    return (sm as DraftSemanticModel).draftID !== undefined;
  };

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

  /**
   * Get a default draft model for a table
   */
  static getDefaultDraftSemanticModel(
    id: string,
    name: string,
    table: Table,
    description = ""
  ): DraftSemanticModel {
    const graph = new SMGraph(
      id,
      table.columns.map((column, index) => ({
        id: `col-${index}`,
        label: column,
        columnIndex: index,
        nodetype: "data_node",
      })),
      []
    );
    graph.stale = true;
    return new DraftSemanticModel(id, name, description, 0, graph, table.id);
  }
}

export class SemanticModelStore extends CRUDStore<
  number,
  DraftSemanticModel,
  SemanticModel,
  SemanticModel
> {
  constructor() {
    super(`${SERVER}/api/semanticmodel`, undefined, false, [
      new SingleKeyIndex("table"),
    ]);
  }

  get tableIndex() {
    return this.indices[0] as SingleKeyIndex<number, number, SemanticModel>;
  }

  /** Generate new draft id */
  getNewCreateDraftId = (table: Table): string => {
    let i = 0;
    while (true) {
      const id = `draft-${i}:${table.id}`;
      if (this.getCreateDraft(id) === undefined) {
        return id;
      }
      i++;
    }
  };

  /** Generate new semantic model name */
  getNewSemanticModelName(table: Table): string {
    const sms = this.findByTable(table.id);
    const drafts = this.getCreateDraftsByTable(table);

    let idx = -1;
    for (const sm of sms.concat(drafts)) {
      const m = /sm-(\d+)/.exec(sm.name);
      if (m === null) continue;
      if (parseInt(m[1]) >= idx) {
        idx = Math.max(idx, parseInt(m[1]));
      }
    }
    return `sm-${idx + 1}`;
  }

  /** Get all drafts of a table */
  getCreateDraftsByTable(table: Table): DraftSemanticModel[] {
    const drafts = [];
    for (const draft of this.createDrafts.values()) {
      if (draft.table === table.id) {
        drafts.push(draft);
      }
    }
    return drafts;
  }

  /**
   * Find semantic models of the given table.
   */
  public findByTable(tableId: number): SemanticModel[] {
    return Array.from(this.tableIndex.index.get(tableId) || []).map(
      (id) => this.records.get(id)!
    );
  }

  /**
   * Remove a record (by id) from your indexes
   */
  protected deindex(record: SemanticModel): void {
    for (const index of this.indices) {
      index.remove(record);
    }
  }

  /** Whether we have local copies of semantic models of a given table */
  public hasByTable(tableId: number): boolean {
    return this.tableIndex.index.has(tableId);
  }

  public deserialize(record: any): SemanticModel {
    const nodes: SMNode[] = record.data.nodes.map((node: any) => {
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
    const edges: SMEdge[] = record.data.edges;

    let graph = new SMGraph(record.id.toString(), nodes, edges);
    return new SemanticModel(
      record.id,
      record.name,
      record.description,
      record.version,
      graph,
      record.table
    );
  }

  public serializeUpdateDraft(record: SemanticModel): object {
    record.version += 1;
    return {
      table: record.table,
      name: record.name,
      description: record.description,
      version: record.version,
      data: {
        /* eslint-disable array-callback-return */
        nodes: record.graph.nodes.map((node) => {
          switch (node.nodetype) {
            case "class_node":
              return {
                id: node.id,
                uri: node.uri,
                approximation: node.approximation,
                label: node.label,
                type: node.nodetype,
              };
            case "data_node":
              return {
                id: node.id,
                label: node.label,
                column_index: node.columnIndex,
                type: node.nodetype,
              };
            case "literal_node":
              return {
                id: node.id,
                value: node.value,
                label: node.label,
                is_in_context: node.isInContext,
                type: node.nodetype,
              };
          }
        }),
        /* eslint-enable array-callback-return */
        edges: record.graph.edges.map((edge) => {
          return {
            source: edge.source,
            target: edge.target,
            uri: edge.uri,
            approximation: edge.approximation,
            label: edge.label,
          };
        }),
      },
    };
  }

  public serializeCreateDraft(record: DraftSemanticModel): object {
    return this.serializeUpdateDraft(record);
  }
}
