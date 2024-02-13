import { RStore } from "gena-app";
import { SERVER } from "../../env";
import { Entity } from "./Entity";
import axios from "axios";

export interface EntityTextSearchResult {
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
   * Get search results from the search API.
   *
   * @returns Promise<SearchResult[]>
   */
  async findByName(query: string): Promise<EntityTextSearchResult[]> {
    let resp: any = await axios.get(`${SERVER}/api/search/entities`, {
      params: {
        q: query,
      },
    });
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
