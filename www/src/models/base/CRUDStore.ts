import axios from "axios";
import { observable, flow, makeObservable } from "mobx";
import { CancellablePromise } from "mobx/dist/api/flow";
import { DraftCreateRecord, DraftUpdateRecord, Record } from "./Record";
import { RStore } from "./RStore";

/**
 * A CRUD store use Map to store records
 */
export abstract class CRUDStore<
  ID extends string | number,
  C extends DraftCreateRecord,
  U extends DraftUpdateRecord<ID, M>,
  M extends Record<ID>
> extends RStore<ID, M> {
  public createDrafts: Map<string, C> = new Map();
  public updateDrafts: Map<ID, U> = new Map();

  protected createAJAXParams = { URL: undefined as any, config: {} };
  protected onDeleteListeners: ((id: ID) => void)[] = [];

  constructor(remoteURL: string) {
    super(remoteURL);
    makeObservable(this, {
      createDrafts: observable,
      updateDrafts: observable,
    });
  }

  public addOnDeleteListener(listener: (id: ID) => void) {
    this.onDeleteListeners.push(listener);
  }

  /**
   * Create the record, will sync with remote server.
   */
  public create: (draft: C, discardDraft?: boolean) => CancellablePromise<M> =
    flow(function* (
      this: CRUDStore<ID, C, U, M>,
      draft: C,
      discardDraft: boolean = true
    ) {
      try {
        this.state.value = "updating";

        let resp = yield axios.post(
          this.createAJAXParams.URL || this.remoteURL,
          this.serializeCreateDraft(draft),
          this.createAJAXParams.config
        );
        let record = this.deserialize(resp.data);

        this.records.set(record.id, record);

        if (discardDraft) {
          this.createDrafts.delete(draft.draftID);
        }

        this.state.value = "updated";
        return record;
      } catch (error: any) {
        this.state.value = "error";
        this.ajaxErrorHandler(error);
        throw error;
      }
    });

  /**
   * Update the record, with sync with remote server
   */
  public update = flow(function* (this: CRUDStore<ID, C, U, M>, draft: U) {
    try {
      this.state.value = "updating";

      let resp = yield axios.post(
        `${this.remoteURL}/${draft.id}`,
        this.serializeUpdateDraft(draft)
      );
      let record = draft.toModel() || this.deserialize(resp.data);
      draft.markSaved();
      this.records.set(record.id, record);

      this.state.value = "updated";
      return record;
    } catch (error: any) {
      this.state.value = "error";
      this.ajaxErrorHandler(error);
      throw error;
    }
  });

  /**
   * Remove a record, will sync with remote server
   */
  public delete = flow(function* (this: CRUDStore<ID, C, U, M>, id: ID) {
    try {
      this.state.value = "updating";

      yield axios.delete(`${this.remoteURL}/${id}`);
      this.records.delete(id);
      for (let listener of this.onDeleteListeners) {
        listener(id);
      }

      this.state.value = "updated";
    } catch (error: any) {
      this.state.value = "error";
      this.ajaxErrorHandler(error);
      throw error;
    }
  });

  /**
   * Get a create draft from the store. Return undefined if does not exist
   */
  public getCreateDraft(draftID: string): C | undefined {
    return this.createDrafts.get(draftID);
  }

  public setCreateDraft(draft: C) {
    this.createDrafts.set(draft.draftID, draft);
  }

  public deleteCreateDraft(draftID: string) {
    this.createDrafts.delete(draftID);
  }

  public getUpdateDraft(id: ID): U | undefined {
    return this.updateDrafts.get(id);
  }

  public setUpdateDraft(draft: U) {
    this.updateDrafts.set(draft.id, draft);
  }

  public deleteUpdateDraft(id: ID) {
    this.updateDrafts.delete(id);
  }

  /**
   * Serialize the update to send to the server
   */
  public abstract serializeUpdateDraft(record: U): object;

  /**
   * Serialize the create object to send to the server
   */
  public abstract serializeCreateDraft(record: C): object;
}
