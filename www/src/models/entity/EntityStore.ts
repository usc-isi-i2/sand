import { RStore } from "gena-app";
import { SERVER } from "../../env";
import { Entity } from "./Entity";

export class EntityStore extends RStore<string, Entity> {
  constructor() {
    super(`${SERVER}/api/entities`, undefined, false);
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
