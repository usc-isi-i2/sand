import { SERVER } from "../../env";
import { FetchResult, PairKeysUniqueIndex, RStore } from "rma-baseapp";
import { Table, TableRow } from "./Table";
import { action, makeObservable, flow } from "mobx";
import { CancellablePromise } from "mobx/dist/api/flow";

export class TableRowStore extends RStore<number, TableRow> {
  constructor() {
    super(`${SERVER}/api/tablerow`, undefined, false, [
      new PairKeysUniqueIndex("table", "index"),
    ]);

    makeObservable(this, {
      fetchByTable: action,
    });
  }

  get tableIndex() {
    return this.indices[0] as PairKeysUniqueIndex<
      number,
      number,
      number,
      TableRow
    >;
  }

  /**
   * Find rows of the table
   *
   * @param tableId
   * @param start the start row
   * @param no number of rows to return
   * @returns
   */
  fetchByTable: (
    table: Table,
    start: number,
    no: number
  ) => CancellablePromise<TableRow[]> = flow(function* (
    this: TableRowStore,
    table: Table,
    start: number,
    no: number
  ) {
    // update the query so we won't query rows not in the table
    if (table.size < start + no) {
      no = table.size - start;
    }

    let hasLocalData = true;
    const map = this.tableIndex.index.get(table.id);
    if (map === undefined) {
      const result: FetchResult<TableRow> = yield this.fetch({
        limit: no,
        offset: start,
        conditions: { table: table.id },
      });
      return result.records;
    }

    const output = [];
    for (let i = 0; i < no; i++) {
      const rowId = map.get(i + start);
      if (rowId === undefined) {
        hasLocalData = false;
        break;
      }
      output.push(this.records.get(rowId)!);
    }

    if (hasLocalData) return output;
    const result: FetchResult<TableRow> = yield this.fetch({
      limit: no,
      offset: start,
      conditions: { table: table.id },
    });
    return result.records;
  });

  protected index(record: TableRow) {
    this.tableIndex.add(record);
  }

  public deserialize = (record: any): TableRow => {
    Object.values(record.links).forEach((links: any) => {
      links.forEach((link: any) => {
        if (link.entity !== null) {
          link.entityId = link.entity;
        }
        // convert null url to undefined
        if (link.url === null) {
          delete link.url;
        }
        link.candidate_entities.forEach((ce: any) => {
          ce.entityId = ce.entity;
          delete ce.entity;
        });
        link.candidateEntities = link.candidate_entities;
        delete link.entity_id;
        delete link.candidate_entities;
      });
    });
    return record;
  };
}
