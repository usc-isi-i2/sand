import { SERVER } from "../../env";
import { PairKeysUniqueIndex, RStore } from "rma-baseapp";
import { TableRow } from "./Table";

export class TableRowStore extends RStore<number, TableRow> {
  protected tableIndex: PairKeysUniqueIndex<number, number, number> =
    new PairKeysUniqueIndex("table", "index");

  constructor() {
    super(`${SERVER}/api/tablerow`, undefined, false);
  }

  /**
   * Find rows of the table
   *
   * @param tableId
   * @param start the start row
   * @param no number of rows to return
   * @returns
   */
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
    this.tableIndex.add(record);
  }

  public deserialize(record: any): TableRow {
    Object.values(record.links).forEach((links: any) => {
      links.forEach((link: any) => {
        if (link.entity !== null) {
          link.entityId = link.entity;
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
  }
}
