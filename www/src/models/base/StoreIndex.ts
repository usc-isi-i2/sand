import { makeObservable, observable } from "mobx";

export class PairKeysUniqueIndex<
  ID extends string | number,
  F1 extends string | number,
  F2 extends string | number
> {
  public index: Map<F1, Map<F2, ID>> = new Map();

  protected field1: string;
  protected field2: string;

  constructor(field1: string, field2: string) {
    this.field1 = field1;
    this.field2 = field2;
    makeObservable(this, {
      index: observable,
    });
  }

  /**
   * Index record
   */
  public index_record(m: any) {
    const key1 = m[this.field1];
    const key2 = m[this.field2];

    if (!this.index.has(key1)) {
      this.index.set(key1, new Map());
    }

    let map = this.index.get(key1)!;
    if (!map.has(key2)) {
      map.set(key2, m.id);
    }
  }
}

export class SingleKeyIndex<
  ID extends string | number,
  F extends string | number
> {
  public index: Map<F, ID[]> = new Map();

  protected field: string;

  constructor(field: string) {
    this.field = field;
    makeObservable(this, {
      index: observable,
    });
  }

  public index_record(m: any) {
    const key = m[this.field];

    if (!this.index.has(key)) {
      this.index.set(key, []);
    }

    this.index.get(key)!.push(m.id);
  }
}

export class SingleKeyOrderedIndex<
  ID extends string | number,
  F extends string | number
> {
  public index: Map<F, ID[]> = new Map();

  protected field: string;

  constructor(field: string) {
    this.field = field;
    makeObservable(this, {
      index: observable,
    });
  }

  public index_record(m: any) {
    const key = m[this.field];

    if (!this.index.has(key)) {
      this.index.set(key, []);
    }

    this.index.get(key)!.push(m.id);
  }
}
