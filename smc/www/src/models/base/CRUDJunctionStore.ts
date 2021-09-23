import { observable, action, runInAction, makeObservable } from "mobx";
import { CRUDStore } from "./CRUDStore";
import { StoreState } from "./RStore";
import axios, { AxiosError } from "axios";
import { DraftUpdateJunctionRecord, JunctionRecord, Record } from "./Record";

type R<JID extends string | number> = { links: Set<JID>; fetchedAll: boolean };

class ForeignKeyTable<
  JID extends string | number,
  AID extends string | number
  > {
  public data: Map<AID, R<JID>> = new Map();

  constructor() {
    makeObservable(this, {
      data: observable,
      deleteAll: action,
      setFetchedAll: action,
      addOne: action,
      deleteOne: action
    })
  }

  get(aid: AID): R<JID> | undefined {
    return this.data.get(aid);
  }

  has(aid: AID): boolean {
    return this.data.has(aid);
  }

  deleteAll(aid: AID): Set<JID> | JID[] {
    let record = this.data.get(aid);
    this.data.delete(aid);

    if (record === undefined) {
      return [];
    }

    return record.links;
  }

  setFetchedAll(aid: AID, fetchedAll: boolean) {
    let record = this.data.get(aid);
    if (record !== undefined) {
      record.fetchedAll = fetchedAll;
    }
  }

  addOne(jid: JID, aid: AID) {
    if (!this.data.has(aid)) {
      this.data.set(aid, { links: new Set(), fetchedAll: false });
    }
    this.data.get(aid)!.links.add(jid);
  }

  deleteOne(jid: JID, aid: AID) {
    if (this.data.has(aid)) {
      this.data.get(aid)!.links.delete(jid);
    }
  }
}

/**
 * A CRUD store for storing many-to-many relationships between tables
 */
export abstract class CRUDJunctionStore<
  JID extends string | number,
  AID extends string | number,
  BID extends string | number,
  C,
  U extends DraftUpdateJunctionRecord<JID, AID, BID, J>,
  J extends JunctionRecord<JID, AID, BID>,
  A extends Record<AID>,
  B extends Record<BID>,
  AS extends CRUDStore<AID, any, any, A>,
  BS extends CRUDStore<BID, any, any, B>
  > {
  state: StoreState = new StoreState();

  records: Map<JID, J> = new Map();
  tblA: ForeignKeyTable<JID, AID> = new ForeignKeyTable();
  tblB: ForeignKeyTable<JID, BID> = new ForeignKeyTable();

  protected remoteURL: string;
  protected fieldA: string;
  protected fieldB: string;
  protected storeA: AS;
  protected storeB: BS;

  public ajaxErrorHandler: (error: AxiosError<any>) => void = () => { };

  constructor(
    storeA: AS,
    storeB: BS,
    remoteURL: string,
    fieldA: string,
    fieldB: string
  ) {
    this.storeA = storeA;
    this.storeB = storeB;
    this.remoteURL = remoteURL;
    this.fieldA = fieldA;
    this.fieldB = fieldB;

    makeObservable(this, {
      state: observable,
      records: observable,
      tblA: observable,
      tblB: observable,
      onDeleteCascadeTableA: action,
      onDeleteCascadeTableB: action,
      create: action,
      update: action,
      delete: action,
      deleteByPair: action,
      fetchByAID: action,
      fetchByBID: action,
      fetchByAIDAndBIDs: action,
      fetchByAIDsAndBID: action,
      fetchBByAID: action,
      fetchAByBID: action
    })
  }

  public onDeleteCascadeTableA(aid: AID) {
    for (let jid of this.tblA.deleteAll(aid)) {
      let record = this.records.get(jid)!;
      this.records.delete(jid);
      this.tblB.deleteOne(jid, record.bid);
    }
  }

  public onDeleteCascadeTableB(bid: BID) {
    for (let jid of this.tblB.deleteAll(bid)) {
      let record = this.records.get(jid)!;
      this.records.delete(jid);
      this.tblA.deleteOne(jid, record.aid);
    }
  }

  async create(draft: C): Promise<J> {
    try {
      this.state.value = "updating";

      let resp = await axios.post(
        `${this.remoteURL}`,
        this.serializeCreateDraft(draft)
      );

      return runInAction(() => {
        let record = this.deserialize(resp.data);
        this.records.set(record.id, record);
        this.tblA.addOne(record.id, record.aid);
        this.tblB.addOne(record.id, record.bid);
        this.state.value = "updated";
        return record;
      });
    } catch (error: any) {
      runInAction(() => {
        this.state.value = "error";
      });
      this.ajaxErrorHandler(error);
      throw error;
    }
  }

  async update(draft: U): Promise<J> {
    try {
      this.state.value = "updating";

      let resp = await axios.post(
        `${this.remoteURL}/${draft.id}`,
        this.serializeUpdateDraft(draft)
      );

      return runInAction(() => {
        draft.markSaved();

        let oldRecord = this.records.get(draft.id)!;
        this.tblA.deleteOne(oldRecord.id, oldRecord.aid);
        this.tblB.deleteOne(oldRecord.id, oldRecord.bid);

        let record = draft.toModel() || this.deserialize(resp.data);

        this.records.set(record.id, record);
        this.tblA.addOne(record.id, record.aid);
        this.tblB.addOne(record.id, record.bid);
        this.state.value = "updated";
        return record;
      });
    } catch (error: any) {
      runInAction(() => {
        this.state.value = "error";
      });
      this.ajaxErrorHandler(error);
      throw error;
    }
  }

  async delete(jid: JID): Promise<void> {
    try {
      this.state.value = "updating";
      let record = this.records.get(jid)!;

      await axios.delete(`${this.remoteURL}/${jid}`);

      runInAction(() => {
        this.records.delete(jid);
        this.tblA.deleteOne(jid, record.aid);
        this.tblB.deleteOne(jid, record.bid);
        this.state.value = "updated";
      });
    } catch (error: any) {
      runInAction(() => {
        this.state.value = "error";
      });
      this.ajaxErrorHandler(error);
      throw error;
    }
  }

  async deleteByPair(aid: AID, bid: BID): Promise<void> {
    try {
      this.state.value = "updating";
      let resp = await axios.delete(`${this.remoteURL}`, {
        data: { [this.fieldA]: aid, [this.fieldB]: bid },
      });
      let jid = resp.data.id;

      runInAction(() => {
        this.records.delete(jid);
        this.tblA.deleteOne(jid, aid);
        this.tblB.deleteOne(jid, bid);
        this.state.value = "updated";
      });
    } catch (error: any) {
      runInAction(() => {
        this.state.value = "error";
      });
      this.ajaxErrorHandler(error);
      throw error;
    }
  }

  async fetchByAID(aid: AID, limit: number, offset: number): Promise<J[]> {
    try {
      this.state.value = "updating";
      let resp = await axios.get(`${this.remoteURL}`, {
        params: { limit, offset, [this.fieldA]: aid },
      });

      return runInAction(() => {
        let result = [];

        for (let item of resp.data) {
          if (item[this.fieldA] !== undefined) {
            this.storeA.set(this.storeA.deserialize(item[this.fieldA]));
          }
          if (item[this.fieldB] !== undefined) {
            this.storeB.set(this.storeB.deserialize(item[this.fieldB]));
          }

          let record = this.deserialize(item);
          result.push(record);

          this.records.set(record.id, record);
          this.tblA.addOne(record.id, record.aid);
          this.tblB.addOne(record.id, record.bid);
        }

        this.tblA.setFetchedAll(aid, resp.data.length < limit);
        return result;
      });
    } catch (error: any) {
      runInAction(() => {
        this.state.value = "error";
      });
      this.ajaxErrorHandler(error);
      throw error;
    }
  }

  async fetchByBID(bid: BID, limit: number, offset: number): Promise<J[]> {
    try {
      this.state.value = "updating";
      let resp = await axios.get(`${this.remoteURL}`, {
        params: { limit, offset, [this.fieldB]: bid },
      });

      return runInAction(() => {
        let result = [];

        for (let item of resp.data) {
          if (item[this.fieldA] !== undefined) {
            this.storeA.set(this.storeA.deserialize(item[this.fieldA]));
          }
          if (item[this.fieldB] !== undefined) {
            this.storeB.set(this.storeB.deserialize(item[this.fieldB]));
          }

          let record = this.deserialize(item);
          result.push(record);

          this.records.set(record.id, record);
          this.tblA.addOne(record.id, record.aid);
          this.tblB.addOne(record.id, record.bid);
        }

        this.tblB.setFetchedAll(bid, resp.data.length < limit);
        return result;
      });
    } catch (error: any) {
      runInAction(() => {
        this.state.value = "error";
      });
      this.ajaxErrorHandler(error);
      throw error;
    }
  }

  async fetchByAIDAndBIDs(aid: AID, bids: BID[]): Promise<J[]> {
    try {
      this.state.value = "updating";
      let resp = await axios.get(`${this.remoteURL}`, {
        params: { [this.fieldA]: aid, [`${this.fieldB}__in`]: bids },
      });

      return runInAction(() => {
        let result = [];

        for (let item of resp.data) {
          if (item[this.fieldA] !== undefined) {
            this.storeA.set(this.storeA.deserialize(item[this.fieldA]));
          }
          if (item[this.fieldB] !== undefined) {
            this.storeB.set(this.storeB.deserialize(item[this.fieldB]));
          }

          let record = this.deserialize(item);
          result.push(record);

          this.records.set(record.id, record);
          this.tblA.addOne(record.id, record.aid);
          this.tblB.addOne(record.id, record.bid);
        }

        return result;
      });
    } catch (error: any) {
      runInAction(() => {
        this.state.value = "error";
      });
      this.ajaxErrorHandler(error);
      throw error;
    }
  }

  async fetchByAIDsAndBID(aids: AID[], bid: BID): Promise<J[]> {
    try {
      this.state.value = "updating";
      let resp = await axios.get(`${this.remoteURL}`, {
        params: { [this.fieldB]: bid, [`${this.fieldA}__in`]: aids },
      });

      return runInAction(() => {
        let result = [];

        for (let item of resp.data) {
          if (item[this.fieldA] !== undefined) {
            this.storeA.set(this.storeA.deserialize(item[this.fieldA]));
          }
          if (item[this.fieldB] !== undefined) {
            this.storeB.set(this.storeB.deserialize(item[this.fieldB]));
          }

          let record = this.deserialize(item);
          result.push(record);

          this.records.set(record.id, record);
          this.tblA.addOne(record.id, record.aid);
          this.tblB.addOne(record.id, record.bid);
        }

        return result;
      });
    } catch (error: any) {
      runInAction(() => {
        this.state.value = "error";
      });
      this.ajaxErrorHandler(error);
      throw error;
    }
  }

  async fetchBByAID(aid: AID, limit: number, offset: number): Promise<B[]> {
    let resp = await this.fetchByAID(aid, limit, offset);
    return resp.map((r) => this.storeB.get(r.bid)!);
  }

  async fetchAByBID(bid: BID, limit: number, offset: number): Promise<A[]> {
    let resp = await this.fetchByBID(bid, limit, offset);
    return resp.map((r) => this.storeA.get(r.aid)!);
  }

  findAByName = async (bid: BID, name: string): Promise<A[]> => {
    let resp: any;
    try {
      resp = await axios.get(`${this.remoteURL}`, {
        params: {
          [this.fieldB]: bid,
          q: name,
        },
      });
    } catch (error: any) {
      this.ajaxErrorHandler(error);
      throw error;
    }

    return resp.data.map(this.storeA.deserialize);
  };

  findBByName = async (aid: AID, name: string): Promise<B[]> => {
    let resp: any;
    try {
      resp = await axios.get(`${this.remoteURL}`, {
        params: {
          [this.fieldA]: aid,
          q: name,
        },
      });
    } catch (error: any) {
      this.ajaxErrorHandler(error);
      throw error;
    }

    return resp.data.map(this.storeB.deserialize);
  };

  hasLink(aid: AID, bid: BID): boolean {
    if (!this.tblA.has(aid)) return false;

    for (let jid of this.tblA.get(aid)!.links) {
      if (this.records.get(jid)!.bid === bid) {
        return true;
      }
    }

    return false;
  }

  getRecordBByAID(aid: AID): B[] {
    let record = this.tblA.get(aid);
    if (record === undefined) return [];
    return Array.from(
      record.links.values(),
      (jid) => this.storeB.get(this.records.get(jid)!.bid)!
    );
  }

  getRecordAByBID(bid: BID): A[] {
    let record = this.tblB.get(bid);
    if (record === undefined) return [];

    return Array.from(
      record.links.values(),
      (jid) => this.storeA.get(this.records.get(jid)!.aid)!
    );
  }

  /**
   * Deserialize the data sent from the server to a record.
   */
  public abstract deserialize(record: any): J;

  /**
   * Serialize the update to send to the server
   */
  public abstract serializeUpdateDraft(record: U): object;

  /**
   * Serialize the create object to send to the server
   */
  public abstract serializeCreateDraft(record: C): object;
}
