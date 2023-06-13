import { RStore } from "gena-app";
import { SERVER } from "../../env";
import { Entity } from "./Entity";
import axios, { AxiosRequestConfig } from "axios";

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

export class EntityStore extends RStore<string, Entity> {
  constructor() {
    super(`${SERVER}/api/entities`, undefined, false);
  }

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

  public deserialize(record: any): Entity {
    record.readableLabel = record.readable_label;
    delete record.readable_label;
    for (const stmts of Object.values(record.properties)) {
      for (let stmt of stmts as any[]) {
        stmt.qualifiersOrder = stmt.qualifiers_order;
        delete stmt.qualifiers_order;
      }
    }
    return new Entity(
      record.id,
      record.uri,
      record.label,
      record.readableLabel,
      record.aliases,
      record.description,
      record.properties
    );
  }
}
