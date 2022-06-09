import { useEffect, useMemo } from "react";
import { Property, useStores } from "../../models";
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

/**
 * A placeholder for a property that has not been loaded yet.
 */
export interface IncompleteProperty {
  id: string;
  // will just be the property id
  label: string;
  // whether the value is still fetching or not
  doesNotExist: boolean;
}

/**
 * Type guard to check if a property is loaded (completed)
 */
export function isPropertyComplete(
  prop: Property | IncompleteProperty
): prop is Property {
  return (prop as IncompleteProperty).doesNotExist === undefined;
}

export type ID2Prop = Record<string, Property | IncompleteProperty>;

/**
 * Gather properties of an entity.
 */
export function useEntityProperties(entity: Entity): ID2Prop {
  const propIds = useMemo(() => {
    const ids: Set<string> = new Set();
    for (const [pid, stmts] of Object.entries(entity.properties)) {
      ids.add(pid);
      for (const stmt of stmts) {
        for (const qid of Object.keys(stmt.qualifiers)) {
          ids.add(qid);
        }
      }
    }
    return Array.from(ids);
  }, [entity]);

  const { propertyStore } = useStores();

  useEffect(() => {
    propertyStore.batch.fetchByIds(propIds);
  }, [propertyStore.batch, propIds]);

  return Object.fromEntries(
    propIds.map((id) => {
      const record = propertyStore.get(id);
      if (record) {
        return [id, record];
      }
      return [id, { id, doesNotExist: record === null }];
    })
  );
}
