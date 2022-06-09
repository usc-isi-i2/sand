import { action, computed, makeObservable, observable } from "mobx";
import { ClassStore, EntityStore, TableRow } from "../../../../models";
import { appConfig } from "../../../../models/settings";

export class ColumnFilter {
  public type2op: { [type: string]: "null" | "include" | "exclude" } = {};
  public selectNil: boolean = false;
  public selectUnlinked: boolean = false;
  public includeCandidateEntities: boolean = true;

  protected columnIndex: number;
  protected onChange: () => void;

  constructor(columnIndex: number, onChange: () => void) {
    this.columnIndex = columnIndex;
    this.onChange = onChange;

    makeObservable(this, {
      type2op: observable,
      selectNil: observable,
      selectUnlinked: observable,
      includeCandidateEntities: observable,
      hasFilter: computed,
      addTypes: action,
      setSelectNil: action,
      setSelectUnlinked: action,
      setIncludeCandidateEntities: action,
      toggleAllType: action,
      setTypeOp: action,
    });
  }

  addTypes = (types: string[]) => {
    for (const type of types) {
      this.type2op[type] = "null";
    }
  };

  setIncludeCandidateEntities = (value: boolean) => {
    if (this.includeCandidateEntities === value) return;
    this.includeCandidateEntities = value;
    this.onChange();
  };

  setSelectNil = (value: boolean) => {
    if (this.selectNil === value) return;
    this.selectNil = value;
    this.onChange();
  };

  setSelectUnlinked = (value: boolean) => {
    if (this.selectUnlinked === value) return;
    this.selectUnlinked = value;
    this.onChange();
  };

  /**
   * Set all types to a new op if the next state is checked.
   * Otherwise, only states of the same op are changed to null.
   */
  toggleAllType = (op: "null" | "include" | "exclude", checked: boolean) => {
    let hasChange = false;

    if (checked) {
      for (const type in this.type2op) {
        if (this.type2op[type] === op) continue;
        this.type2op[type] = op;
        hasChange = true;
      }
    } else {
      for (const type in this.type2op) {
        if (this.type2op[type] === op) {
          this.type2op[type] = "null";
          hasChange = true;
        }
      }
    }

    if (hasChange) {
      this.onChange();
    }
  };

  setTypeOp = (type: string, op: "null" | "include" | "exclude") => {
    if (this.type2op[type] === op) return;
    this.type2op[type] = op;
    this.onChange();
  };

  hasAnyOp = (op: "null" | "include" | "exclude") => {
    for (const type in this.type2op) {
      if (this.type2op[type] === op) return true;
    }
    return false;
  };

  hasAllOp = (op: "null" | "include" | "exclude") => {
    for (const type in this.type2op) {
      if (this.type2op[type] !== op) return false;
    }
    return true;
  };

  /** Whether we have any filter on */
  get hasFilter() {
    for (const type in this.type2op) {
      if (this.type2op[type] !== "null") return true;
    }
    return this.selectNil || this.selectUnlinked;
  }

  /** Test whether the row match this filter */
  getFilterExec = (entStore: EntityStore, classStore: ClassStore) => {
    // gather include & exclude types
    const includeTypeIds: string[] = [];
    const excludeTypeIds: string[] = [];
    for (const type in this.type2op) {
      if (this.type2op[type] === "include") {
        includeTypeIds.push(type);
      } else if (this.type2op[type] === "exclude") {
        excludeTypeIds.push(type);
      }
    }

    return async (row: TableRow) => {
      if (!this.hasFilter) return true;

      // nil and unlinked are or operator (not and operator)
      if (this.selectNil || this.selectUnlinked) {
        for (const link of row.links[this.columnIndex] || []) {
          if (
            (this.selectNil && link.entityId === appConfig.NIL_ENTITY) ||
            (this.selectUnlinked && link.entityId === undefined)
          )
            return true;
        }

        if (
          this.selectUnlinked &&
          (row.links[this.columnIndex] || []).length === 0
        ) {
          return true;
        }

        return false;
      }

      // now apply the filter on those types
      const entIds = new Set<string>();
      for (const link of row.links[this.columnIndex] || []) {
        if (
          link.entityId !== appConfig.NIL_ENTITY &&
          link.entityId !== undefined
        ) {
          entIds.add(link.entityId);
        }
        if (this.includeCandidateEntities) {
          for (const canEnt of link.candidateEntities) {
            entIds.add(canEnt.entityId);
          }
        }
      }

      if (entIds.size === 0) return false;

      const ents = await entStore.fetchByIds(Array.from(entIds));
      const classes = await classStore.fetchByIds(
        Object.values(ents).flatMap((ent) => {
          const instanceOf = appConfig.instanceof(ent.uri);
          if (
            instanceOf === undefined ||
            ent.properties[instanceOf] === undefined
          ) {
            return [];
          }

          const output = [];
          for (const stmt of ent.properties[instanceOf]) {
            if (stmt.value.type === "entityid") {
              output.push(stmt.value.value);
            }
          }
          return output;
        })
      );

      return (
        (includeTypeIds.length === 0 ||
          Object.values(classes).some((klass) =>
            includeTypeIds.some(
              (typeId) =>
                klass.id === typeId || klass.parentsClosure.has(typeId)
            )
          )) &&
        (excludeTypeIds.length === 0 ||
          !Object.values(classes).some((klass) =>
            excludeTypeIds.some(
              (typeId) =>
                klass.id === typeId || klass.parentsClosure.has(typeId)
            )
          ))
      );
    };
  };
}

export class TableFilter {
  public columnFilters: ColumnFilter[] = [];

  protected onChange = (filter: TableFilter) => {};

  constructor(nColumns: number, onChange?: (filter: TableFilter) => void) {
    if (onChange !== undefined) {
      this.onChange = onChange;
    }

    for (let i = 0; i < nColumns; i++) {
      this.columnFilters.push(
        new ColumnFilter(i, () => {
          this.handleChange();
        })
      );
    }

    makeObservable(this, {
      columnFilters: observable,
      setOnChange: action,
    });
  }

  setOnChange = (onChange: (filter: TableFilter) => void) => {
    this.onChange = onChange;
  };

  handleChange = () => {
    this.onChange(this);
  };

  /** Whether we have any filter on */
  hasFilter = () => {
    return this.columnFilters.some((c) => c.hasFilter);
  };

  /** Filter rows */
  filter = async (
    rows: TableRow[],
    entStore: EntityStore,
    classStore: ClassStore
  ) => {
    const filterExecs = this.columnFilters.map((c) =>
      c.getFilterExec(entStore, classStore)
    );

    const matches = await Promise.all(
      rows.map((row) => {
        return Promise.all(filterExecs.map((exec) => exec(row))).then(
          (results) => {
            return results.every((res) => res);
          }
        );
      })
    );
    return rows.filter((row, i) => matches[i]);
  };
}
