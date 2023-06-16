import { RStore } from "gena-app";
import { SERVER } from "../../env";
import { Entity } from "./Entity";
import axios, { AxiosRequestConfig } from "axios";

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
   * @returns Promise<SearchResult[]> if there is no search result from Wikidata API.
   */

  async fetchSearchResults(searchTest: string): Promise<SearchResult[]> {
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
