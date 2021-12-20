import { Entity } from "../../models/entity";
export { Entity } from "../../models/entity";

/**
 * A placeholder for an entity that has not been loaded yet.
 */
export interface IncompleteEntity {
  id: string;
  // whether the value is still fetching or not
  doesNotExist: boolean;
}

/**
 * Type guard to check if an entity is loaded (completed)
 */
export function isEntityComplete(
  entity: Entity | IncompleteEntity
): entity is Entity {
  return (entity as IncompleteEntity).doesNotExist === undefined;
}
