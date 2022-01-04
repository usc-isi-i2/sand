import { RStore, SingleKeyIndex, SingleKeyUniqueIndex } from "rma-baseapp";
import { SERVER } from "../../env";

export interface Class {
  id: string;
  uri: string;
  label: string;
  readableLabel: string;
  aliases: string[];
  description: string;
  parents: string[];
}

export class ClassStore extends RStore<string, Class> {
  constructor() {
    super(`${SERVER}/api/classes`, { readableLabel: "readable_label" }, false, [
      new SingleKeyUniqueIndex("uri"),
    ]);
  }

  get uriIndex() {
    return this.indices[0] as SingleKeyUniqueIndex<string, string, Class>;
  }

  getClassByURI = (uri: string): Class | undefined => {
    const id = this.uriIndex.index.get(uri);
    return id !== undefined ? this.get(id)! : undefined;
  };
}
