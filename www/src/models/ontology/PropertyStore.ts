import { RStore, SingleKeyUniqueIndex } from "gena-app";
import { action, makeObservable, observable, runInAction } from "mobx";
import { SERVER } from "../../env";
import { Property } from "./Property";

export class PropertyStore extends RStore<string, Property> {
  public doesNotExistURIs = new Set<string>();

  constructor() {
    super(
      `${SERVER}/api/properties`,
      { readableLabel: "readable_label" },
      false,
      [new SingleKeyUniqueIndex("uri")]
    );

    makeObservable(this, {
      doesNotExistURIs: observable,
      fetchIfMissingByURI: action,
    });
  }

  get uriIndex() {
    return this.indices[0] as SingleKeyUniqueIndex<string, string, Property>;
  }

  getPropertyByURI = (uri: string): Property | undefined => {
    const id = this.uriIndex.index.get(uri);
    return id !== undefined ? this.get(id)! : undefined;
  };

  /**
   * Fetch a property by URI if it is not in the store.
   *
   * @returns undefined if the URI does not exist in the database.
   */
  async fetchIfMissingByURI(uri: string): Promise<Property | undefined> {
    if (this.doesNotExistURIs.has(uri)) {
      return undefined;
    }

    const id = this.uriIndex.index.get(uri);
    if (id === undefined) {
      const record: Property | undefined = await this.fetchOne({
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

  public deserialize(record: any): Property {
    return new Property(
      record.id,
      record.uri,
      record.label,
      record.readable_label,
      record.aliases,
      record.description,
      record.datatype,
      record.parents
    );
  }
}
