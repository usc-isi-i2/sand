import { makeObservable, observable } from "mobx";

/** An entity modeled according to Wikidata Qnode */
export class Entity {
  public id: string;
  public uri: string;
  public label: MultiLingualString;
  public readableLabel: string;
  public aliases: MultiLingualStringList;
  public description: MultiLingualString;
  public properties: { [prop: string]: Statement[] };

  constructor(
    id: string,
    uri: string,
    label: MultiLingualString,
    readableLabel: string,
    aliases: MultiLingualStringList,
    description: MultiLingualString,
    props: { [prop: string]: Statement[] }
  ) {
    this.id = id;
    this.uri = uri;
    this.label = label;
    this.readableLabel = readableLabel;
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
}

export type MultiLingualString = {
  lang2value: { [lang: string]: string };
  lang: string;
};
export type MultiLingualStringList = {
  lang2values: { [lang: string]: string[] };
  lang: string;
};

export interface Statement {
  value: DataValue;
  // mapping from qualifier id into data value
  qualifiers: { [qualifier: string]: DataValue[] };
  // order of qualifiers as dictionary lacks of order
  qualifiersOrder: string[];
}

export type DataValue =
  | DataValueString
  | DataValueTime
  | DataValueQuantity
  | DataValueGlobeCoordinate
  | DataValueMonolingualText
  | DataValueEntity;

export interface DataValueTime {
  readonly type: "time";
  value: {
    time: string;
    timezone: number;
    before: number;
    after: number;
    precision: number;
    calendarmodel: string;
  };
}

export interface DataValueQuantity {
  readonly type: "quantity";
  value: {
    amount: string;
    upperBound: string;
    lowerBound: string;
    unit: string;
  };
}

export interface DataValueMonolingualText {
  readonly type: "monolingualtext";
  value: {
    text: string;
    language: string;
  };
}

export interface DataValueGlobeCoordinate {
  readonly type: "globecoordinate";
  value: {
    latitude: number;
    longitude: number;
    precision: number;
    altitude: null;
    globe: string;
  };
}

export interface DataValueEntity {
  readonly type: "entityid";
  value: string;
}

export interface DataValueString {
  readonly type: "string";
  value: string;
}
