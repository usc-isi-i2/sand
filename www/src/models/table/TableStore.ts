import { SERVER } from "../../env";
import { SingleKeyIndex, RStore } from "rma-baseapp";
import { Table } from "./Table";

export class TableStore extends RStore<number, Table> {
  constructor() {
    super(`${SERVER}/api/table`, undefined, false, [
      new SingleKeyIndex("project"),
    ]);
  }

  get projectIndex() {
    return this.indices[0] as SingleKeyIndex<number, number, Table>;
  }

  /**
   * Find tables in a project
   *
   * @param projectId
   * @param start
   * @param no number of tables to return
   */
  findByProject = (projectId: number, start?: number, no?: number): Table[] => {
    return Array.from(this.projectIndex.index.get(projectId) || []).map(
      (id) => this.records.get(id)!
    );
  };

  public deserialize = (record: any): Table => {
    record.contextPage = record.context_page;
    if (
      record.contextPage !== null &&
      record.contextPage !== undefined &&
      record.contextPage.entity !== null
    ) {
      record.contextPage.entityId = record.contextPage.entity;
      delete record.contextPage.entity;
    }
    record.contextValues = record.context_values;
    record.contextTree = record.context_tree;
    delete record.context_tree;
    delete record.context_values;
    delete record.context_page;
    return record;
  };

  protected index(record: Table) {
    this.projectIndex.add(record);
  }
}
