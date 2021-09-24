import axios, { AxiosError } from "axios";
import {
  observable,
  flow,
  action,
  runInAction,
  computed,
  makeObservable,
} from "mobx";
import { CancellablePromise } from "mobx/dist/api/flow";
import { Record } from "./Record";

export class StoreState {
  public _value: "updating" | "updated" | "error" = "updated";
  public forbiddenStates: Set<"updating" | "updated" | "error"> = new Set();

  constructor() {
    makeObservable(this, {
      _value: observable,
      value: computed,
    });
  }

  public get value() {
    return this._value;
  }

  public set value(v: "updating" | "updated" | "error") {
    if (this.forbiddenStates.has(v)) {
      return;
    }
    this._value = v;
  }
}

export type QueryConditions = {
  [field: string]:
    | string
    | number
    | { op: "gt" | "lt" | "gte" | "lte"; value: string | number };
};

export interface Query {
  limit: number;
  offset: number;
  fields?: string[];
  conditions?: QueryConditions;
}

export type FetchResult<M> = { records: M[]; total: number };

export abstract class RStore<ID extends string | number, M extends Record<ID>> {
  public state: StoreState = new StoreState();
  public records: Map<ID, M> = new Map();
  public ajaxErrorHandler: (error: AxiosError<any>) => void = () => {};

  protected remoteURL: string;

  constructor(remoteURL: string) {
    this.remoteURL = remoteURL;
    makeObservable(this, {
      state: observable,
      records: observable,
      fetch: action,
      set: action,
      list: computed,
    });
  }

  /**
   * Get a record from the store. If the record doesn't exist, try to fetch it
   * from the server in background.
   */
  public fetchIfMissing(id: ID): M | undefined {
    if (!this.records.has(id)) {
      this.fetch(id);
    }
    return this.records.get(id);
  }

  /**
   * Fetch a record from remote server.
   *
   * Use async instead of flow as we may want to override the function and call super.
   */
  async fetch(id: ID): Promise<M | undefined> {
    try {
      this.state.value = "updating";

      let resp = await axios.get(`${this.remoteURL}/${id}`);

      return runInAction(() => {
        let record = this.deserialize(resp.data);
        this.records.set(record.id, record);
        this.index(record);
        this.state.value = "updated";

        return record;
      });
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // entity does not exist
        runInAction(() => {
          this.state.value = "updated";
        });
        return undefined;
      }

      runInAction(() => {
        this.state.value = "error";
      });
      this.ajaxErrorHandler(error);
      throw error;
    }
  }

  /**
   * Fetch mutliple records from remote server
   */
  public fetchSome: (query: Query) => CancellablePromise<FetchResult<M>> = flow(
    function* (this: RStore<ID, M>, query: Query) {
      try {
        this.state.value = "updating";
        const result = yield this.query(query);

        for (const record of result.records) {
          this.records.set(record.id, record);
          this.index(record);
        }

        this.state.value = "updated";
        return result;
      } catch (error: any) {
        this.state.value = "error";
        throw error;
      }
    }
  );

  /** Query records (not store the result) */
  public query = async (query: Query): Promise<FetchResult<M>> => {
    let params: any = { limit: query.limit, offset: query.offset };
    if (query.fields !== undefined) {
      params.fields = query.fields.join(",");
    }

    if (query.conditions !== undefined) {
      for (const [field, op_or_val] of Object.entries(query.conditions)) {
        if (typeof op_or_val === "object") {
          params[`${field}[${op_or_val.op}]`] = op_or_val.value;
        } else {
          params[`${field}`] = op_or_val;
        }
      }
    }

    let resp: any;
    try {
      resp = await axios.get(`${this.remoteURL}`, { params });
    } catch (error: any) {
      this.ajaxErrorHandler(error);
      throw error;
    }

    return {
      records: resp.data.items.map(this.deserialize),
      total: resp.data.total,
    };
  };

  /**
   * Query records by name (not store the result)
   */
  public queryByName = async (name: string): Promise<FetchResult<M>> => {
    let resp: any;
    try {
      resp = await axios.get(`${this.remoteURL}`, {
        params: {
          q: name,
        },
      });
    } catch (error: any) {
      this.ajaxErrorHandler(error);
      throw error;
    }

    return { records: resp.data.map(this.deserialize), total: resp.data.total };
  };

  /**
   * Test if we store a local copy of a record
   */
  public has(id: ID): boolean {
    return this.records.has(id);
  }

  /**
   * Get a local copy of a record
   */
  public get(id: ID): M | undefined {
    return this.records.get(id);
  }

  /**
   * Save a record to the store
   *
   * @param m the record
   */
  public set(m: M) {
    this.records.set(m.id, m);
  }

  /**
   * Iter through list of local copy of records in the store
   */
  public iter(): IterableIterator<M> {
    return this.records.values();
  }

  /**
   * Get a list of local copy of records in the store
   */
  get list(): M[] {
    return Array.from(this.records.values());
  }

  /**
   * Filter records according to the filter function
   */
  public filter(fn: (r: M) => boolean): M[] {
    let output = [];
    for (let r of this.records.values()) {
      if (fn(r)) {
        output.push(r);
      }
    }
    return output;
  }

  /**
   * Deserialize the data sent from the server to a record
   */
  public deserialize(record: any): M {
    return record;
  }

  /**
   * A function to build a custom index
   */
  protected index(record: M): void {}

  /** Encode a query condition so its can be shared through URL */
  public encodeWhereQuery(condition: QueryConditions) {
    return btoa(JSON.stringify(condition));
  }

  /** Decode a query back to its original form */
  public decodeWhereQuery(encodedCondition: string): QueryConditions {
    return JSON.parse(atob(encodedCondition));
  }
}
