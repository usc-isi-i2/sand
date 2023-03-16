import { makeObservable, observable } from "mobx";

export type DataType =
  | "monolingualtext"
  | "url"
  | "entity"
  | "datetime"
  | "number"
  | "string"
  | "globe-coordinate"
  | "unknown";

export class Property {
  public id: string;
  public uri: string;
  public label: string;
  public readableLabel: string;
  public aliases: string[];
  public description: string;
  public datatype: DataType;
  public parents: string[];
  public ancestors: Set<string>;

  constructor(
    id: string,
    uri: string,
    label: string,
    readableLabel: string,
    aliases: string[],
    description: string,
    datatype: DataType,
    parents: string[],
    ancestors: Set<string>
  ) {
    this.id = id;
    this.uri = uri;
    this.label = label;
    this.readableLabel = readableLabel;
    this.aliases = aliases;
    this.description = description;
    this.datatype = datatype;
    this.parents = parents;
    this.ancestors = ancestors;

    makeObservable(this, {
      id: observable,
      uri: observable,
      label: observable,
      readableLabel: observable,
      aliases: observable,
      description: observable,
      datatype: observable,
      parents: observable,
      ancestors: observable,
    });
  }
}
