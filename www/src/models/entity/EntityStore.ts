import { RStore } from "rma-baseapp";
import { SERVER } from "../../env";
import { Entity } from "./Entity";

export class EntityStore extends RStore<string, Entity> {
  constructor() {
    super(`${SERVER}/api/entities`);
  }

  public deserialize(record: any): Entity {
    for (const stmts of Object.values(record.properties)) {
      for (let stmt of stmts as any[]) {
        stmt.qualifiersOrder = stmt.qualifiers_order;
        delete stmt.qualifiers_order;
      }
    }
    return record;
  }
}
