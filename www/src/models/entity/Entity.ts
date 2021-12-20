import { makeObservable, observable } from "mobx";

/** An entity modeled according to Wikidata Qnode */
export class Entity {
  public id: string;
  public label: MultiLingualString;
  public aliases: MultiLingualStringList;
  public description: MultiLingualString;
  public properties: { [prop: string]: Statement[] };

  constructor(
    id: string,
    label: MultiLingualString,
    aliases: MultiLingualStringList,
    description: MultiLingualString,
    props: { [prop: string]: Statement[] }
  ) {
    this.id = id;
    this.label = label;
    this.aliases = aliases;
    this.description = description;
    this.properties = props;

    makeObservable(this, {
      id: observable,
      label: observable,
      aliases: observable,
      description: observable,
      properties: observable,
    });
  }

  /**
   * Mapping from entity id to url to external KG
   * @param entityId
   */
  static id2uri = (entityId: string): string => {
    switch (entityId[0]) {
      case "Q":
        return `https://www.wikidata.org/wiki/${entityId}`;
      case "P":
        return `https://www.wikidata.org/wiki/Property:${entityId}`;
      case "L":
        return `https://www.wikidata.org/wiki/Lexeme:${entityId}`;
      default:
        return entityId;
    }
  };
}

export type MultiLingualString = { [lang: string]: string };
export type MultiLingualStringList = { [lang: string]: string[] };

export interface Statement {
  value: DataValue;
  // mapping from qualifier id into data value
  qualifiers: { [qualifier: string]: DataValue[] };
  // order of qualifiers as dictionary lacks of order
  qualifiersOrder: string[];
}

export interface DataValue {
  type:
    | "string"
    | "time"
    | "quantity"
    | "globecoordinate"
    | "monolingualtext"
    | "entityid";
  value: string | number | object;
}
