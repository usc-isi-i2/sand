import { RStore, SingleKeyUniqueIndex } from "gena-app";
import { action, makeObservable, observable, runInAction } from "mobx";
import { SERVER } from "../../env";
import axios from "axios";

export interface Class {
  id: string;
  uri: string;
  label: string;
  readableLabel: string;
  aliases: string[];
  description: string;
  parents: string[];
  ancestors: Set<string>;
}

export interface ClassTextSearchResult {
  id: string;
  label: string;
  description: string;
  uri: string;
}

export class ClassStore extends RStore<string, Class> {
  public doesNotExistURIs = new Set<string>();

  constructor() {
    super(`${SERVER}/api/classes`, { readableLabel: "readable_label" }, false, [
      new SingleKeyUniqueIndex("uri"),
    ]);

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
   * Get search results from the search API from axios.
   *
   * @returns Promise<SearchResult[]> if there is no search result from Wikidata API.
   */

  async fetchSearchResults(
    searchTest: string
  ): Promise<ClassTextSearchResult[]> {
    let params: any = {
      q: `${searchTest}`,
    };

    let resp: any;
    try {
      resp = await axios.get(`${SERVER}/api/search/classes`, { params });
    } catch (error) {
      throw error;
    }

    return resp.data.items;
  }

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
    record.ancestors = new Set(record.ancestors);
    return record;
  }
}
