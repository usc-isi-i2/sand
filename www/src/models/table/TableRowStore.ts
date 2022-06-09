import axios from "axios";
import { FetchResult, PairKeysUniqueIndex, SimpleCRUDStore } from "gena-app";
import { action, flow, makeObservable } from "mobx";
import { CancellablePromise } from "mobx/dist/api/flow";
import { SERVER } from "../../env";
import { Link, Table, TableRow } from "./Table";

export class TableRowStore extends SimpleCRUDStore<number, TableRow> {
  constructor() {
    super(`${SERVER}/api/tablerow`, undefined, false, [
      new PairKeysUniqueIndex("table", "index"),
    ]);

    makeObservable(this, {
      fetchByTable: action,
      updateCellLinks: action,
      updateColumnLinks: action,
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
   * Update links of a cell of a single row.
   *
   * @param row the row we want to update
   * @param columnIndex the column we want to save the links
   * @param entityId the entity id we want to associate with the cell
   * @param updateCandidateEntities whether or not to update the candidate entities, or just the entities
   */
  updateCellLinks = flow(function* (
    this: TableRowStore,
    row: TableRow,
    columnIndex: number,
    entityId: string | undefined,
    updateCandidateEntities: boolean
  ) {
    const value = row.row[columnIndex];
    if (typeof value === "number") {
      throw new Error(`Can't not link a number "${value}" to an entity`);
    }

    // first of all, we update the cell
    if (
      row.links[columnIndex] === undefined ||
      row.links[columnIndex].length === 0
    ) {
      if (entityId === undefined) {
        // no need to update as nothing changes
        return;
      }

      // add the entity
      row.links[columnIndex] = [
        {
          start: 0,
          end: value.length,
          url: undefined,
          entityId: entityId,
          candidateEntities: [],
        },
      ];
    }
    row.links[columnIndex][0].entityId = entityId;

    // then, we sync with the database
    try {
      const params = { links: row.links[columnIndex].map(this.serializeLink) };
      if (!updateCandidateEntities) {
        for (const link of params.links) {
          delete (link as any).candidate_entities;
        }
      }

      this.state.value = "updating";
      yield axios.put(
        `${this.remoteURL}/${row.id}/cells/${columnIndex}`,
        params
      );
      this.state.value = "updated";
    } catch (error: any) {
      this.state.value = "error";
      throw error;
    }
  });

  /**
   * Update links of cells in a single column that have the same value as the given input.
   *
   * This function will never sync the candidate entities.
   *
   * @param table the table we want to update
   * @param columnIndex the column we want to save the links
   * @param text cell's value matches with this text will be updated
   * @param entityId the entity id we want to associate with the cell
   */
  updateColumnLinks = flow(function* (
    this: TableRowStore,
    table: Table,
    columnIndex: number,
    text: string,
    entityId: string | undefined
  ) {
    // first, we update cells in the store
    const map = this.tableIndex.index.get(table.id);
    if (map !== undefined) {
      for (const [_index, rowId] of map) {
        const row = this.records.get(rowId)!;
        if (row.row[columnIndex] !== text) {
          continue;
        }

        if (
          row.links[columnIndex] === undefined ||
          row.links[columnIndex].length === 0
        ) {
          if (entityId === undefined) {
            // no need to update as nothing changes
            continue;
          }

          // add the entity
          row.links[columnIndex] = [
            {
              start: 0,
              end: text.length,
              url: undefined,
              entityId: entityId,
              candidateEntities: [],
            },
          ];
        }
        row.links[columnIndex][0].entityId = entityId;
      }
    }

    // then, we sync with the database
    try {
      this.state.value = "updating";
      yield axios.put(`${this.remoteURL}/update_column_links`, {
        table: table.id,
        column: columnIndex,
        text: text,
        entity_id: entityId === undefined ? null : entityId,
      });
      this.state.value = "updated";
    } catch (error: any) {
      this.state.value = "error";
      throw error;
    }
  });

  /**
   * Find rows of the table
   *
   * @param table
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

  public deserialize(record: any): TableRow {
    Object.values(record.links).forEach((links: any) => {
      links.forEach((link: any) => {
        if (link.entity_id !== null) {
          link.entityId = link.entity_id;
        }
        // convert null url to undefined
        if (link.url === null) {
          delete link.url;
        }
        link.candidate_entities.forEach((ce: any) => {
          ce.entityId = ce.entity_id;
          delete ce.entity_id;
        });
        link.candidateEntities = link.candidate_entities;
        delete link.entity_id;
        delete link.candidate_entities;
      });
    });
    return record;
  }

  protected serializeRecord(record: TableRow | Omit<TableRow, "id">): object {
    return {
      table: record.table,
      index: record.index,
      row: Array.from(record.row),
      links: Object.fromEntries(
        Object.entries(record.links).map(([columnIndex, links]) => {
          return [columnIndex, links.map(this.serializeLink)];
        })
      ),
    };
  }

  protected serializeLink = (link: Link): object => {
    return {
      start: link.start,
      end: link.end,
      url: link.url || null,
      entity_id: link.entityId || null,
      candidate_entities: link.candidateEntities.map((canent) => ({
        entity_id: canent.entityId,
        probability: canent.probability,
      })),
    };
  };
}
