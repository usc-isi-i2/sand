import { AxiosError } from "axios";
import { makeObservable, observable } from "mobx";
import { RStore } from "rma-baseapp";
import { SERVER } from "../../env";
import { Entity } from "./Entity";
import { EntitySettings } from "./EntitySettings";

export class EntityStore extends RStore<string, Entity> {
  protected fetchByIdQueue: Map<
    string,
    ((entity?: Entity, error?: AxiosError<any>) => void)[]
  >;
  public settings: EntitySettings;

  constructor() {
    super(`${SERVER}/api/entities`, undefined, false);
    this.fetchByIdQueue = new Map();
    this.settings = new EntitySettings();

    makeObservable(this, {
      settings: observable,
    });
  }

  /**
   * Fetch entity from server. However, only one request is sent out and the rest
   * if coming too fast is going to use the response of the previous request
   *
   * @param id entity id
   * @returns
   */
  public serializeFetchById(id: string): Promise<Entity | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.fetchByIdQueue.has(id)) {
        this.fetchByIdQueue.set(id, []);
        return this.fetchById(id)
          .catch((error) => {
            for (const listener of this.fetchByIdQueue.get(id) || []) {
              listener(undefined, error);
            }
            this.fetchByIdQueue.delete(id);
            throw error;
          })
          .then((entity) => {
            // release the rest of the queued requests
            for (const listener of this.fetchByIdQueue.get(id) || []) {
              listener(entity);
            }
            this.fetchByIdQueue.delete(id);
            return entity;
          });
      } else {
        this.fetchByIdQueue.get(id)!.push((entity, error) => {
          if (error !== undefined) {
            reject(error);
          } else {
            resolve(entity);
          }
        });
      }
    });
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
