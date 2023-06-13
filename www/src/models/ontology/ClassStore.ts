import { RStore, SingleKeyUniqueIndex } from "gena-app";
import { action, makeObservable, observable, runInAction } from "mobx";
import { SERVER } from "../../env";
import axios, { AxiosRequestConfig } from "axios";

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

export interface SearchResults {
  value: string;
  element: SearchResult;
}

export interface SearchResult {
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
   * @returns SearchResults[] if there is no search result from Wikidata API.
   */

  fetchSearchResults = (searchText: string): SearchResults[] => {
    const options: AxiosRequestConfig = {
      method: "GET",
      url: `${SERVER}/api/search/classes`,
      params: { q: `${searchText}` },
    };
    const search_options: SearchResults[] = [];

    axios
      .request(options)
      .then(function ({ data }) {
        data.items.forEach((element: SearchResult) => {
          search_options.push({
            value: `${element.label}(${element.id}) : ${element.description}`,
            element: element,
          });
        });
        return search_options;
      })
      .catch(function (error: any) {
        console.error(error);
      });

    return search_options;
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
    record.ancestors = new Set(record.ancestors);
    return record;
  }
}
