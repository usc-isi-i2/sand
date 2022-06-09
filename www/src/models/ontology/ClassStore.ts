import { RStore, SingleKeyUniqueIndex } from "gena-app";
import { action, makeObservable, observable, runInAction } from "mobx";
import { SERVER } from "../../env";

export interface Class {
  id: string;
  uri: string;
  label: string;
  readableLabel: string;
  aliases: string[];
  description: string;
  parents: string[];
  parentsClosure: Set<string>;
}

export class ClassStore extends RStore<string, Class> {
  public doesNotExistURIs = new Set<string>();

  constructor() {
    super(
      `${SERVER}/api/classes`,
      { readableLabel: "readable_label", parentsClosure: "parents_closure" },
      false,
      [new SingleKeyUniqueIndex("uri")]
    );

    makeObservable(this, {
      doesNotExistURIs: observable,
      fetchIfMissingByURI: action,
    });
  }

  get uriIndex() {
    return this.indices[0] as SingleKeyUniqueIndex<string, string, Class>;
  }

  getClassByURI = (uri: string): Class | undefined => {
    const id = this.uriIndex.index.get(uri);
    return id !== undefined ? this.get(id)! : undefined;
  };

  /**
   * Fetch a class by URI if it is not in the store.
   *
   * @returns undefined if the URI does not exist in the database.
   */

  async fetchIfMissingByURI(uri: string): Promise<Class | undefined> {
    if (this.doesNotExistURIs.has(uri)) {
      return undefined;
    }

    const id = this.uriIndex.index.get(uri);
    if (id === undefined) {
      const record: Class | undefined = await this.fetchOne({
        conditions: { uri },
      });
      if (record === undefined) {
        runInAction(() => {
          this.doesNotExistURIs.add(uri);
        });
      }
      return record;
    }
    return this.get(id)!;
  }

  public deserialize(record: any): Class {
    record = super.deserialize(record);
    record.parentsClosure = new Set(record.parentsClosure);
    return record;
  }
}
