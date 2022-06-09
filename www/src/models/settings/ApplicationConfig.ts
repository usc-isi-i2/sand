export class StartsWithIndex<V> {
  // capture the longest substring from [start, end) that leads us to target or the sub tree
  protected index: {
    [substring: string]:
      | { value: StartsWithIndex<V>; internalNode: true }
      | { internalNode: false; value: V };
  } = {};
  protected start: number = 0;
  protected end: number = 0;

  constructor(start: number, end: number) {
    this.start = start;
    this.end = end;
  }

  public static fromMapping<V>(mapping: { [prefix: string]: V }) {
    // sorted in descending order by their length
    const sortedPrefixes = Object.keys(mapping).sort(
      (a, b) => b.length - a.length
    );
    if (sortedPrefixes.length === 0) {
      throw new Error("Empty mapping");
    }

    const fn = (prefixes: string[], start: number) => {
      const shortestPrefix = prefixes[prefixes.length - 1];
      const index = new StartsWithIndex<V>(start, shortestPrefix.length);

      if (index.start === index.end) {
        // we gonna have an empty key, but we must have more than one prefixes
        index.index[""] = {
          internalNode: false,
          value: mapping[shortestPrefix],
        };
        const subindex = fn(prefixes.slice(0, -1), index.end);
        for (const [key, node] of Object.entries(subindex.index)) {
          index.index[key] = node;
        }
        return index;
      }

      const tmp: { [key: string]: string[] } = {};
      for (const prefix of prefixes) {
        const key = prefix.substring(index.start, shortestPrefix.length);
        if (tmp[key] === undefined) {
          tmp[key] = [];
        }
        tmp[key].push(prefix);
      }

      for (const [key, subprefixes] of Object.entries(tmp)) {
        if (subprefixes.length === 1) {
          index.index[key] = {
            internalNode: false,
            value: mapping[subprefixes[0]],
          };
        } else {
          index.index[key] = {
            internalNode: true,
            // prefixes are sorted in descending order and tmp maintains the order
            value: fn(subprefixes, index.end),
          };
        }
      }
      return index;
    };

    return fn(sortedPrefixes, 0);
  }

  /** Get the target mapping matched with the longest prefix */
  get = (text: string): V | undefined => {
    const key = text.substring(this.start, this.end);
    const item = this.index[key];

    if (item !== undefined) {
      return item.internalNode ? item.value.get(text) : item.value;
    }

    // try empty key
    return this.index[""] !== undefined
      ? (this.index[""].value as V)
      : undefined;
  };
}

export class ApplicationConfig {
  // configuration related to entities
  public NIL_ENTITY: string = "";

  // list of properties' uris that when a column is tagged with one of them, the column is an entity column
  public SEM_MODEL_IDENTS = new Set<string>();

  // list of uri of classes that are used as intermediate nodes to represent n-ary relationships, e.g., wikidata's statement
  public SEM_MODEL_STATEMENTS = new Set<string>();

  // mapping from entity's namespace into the instanceof property that they use
  protected instanceofMapping: { [namespace: string]: string } = {};
  public instanceofProps = new Set<string>(); // list of instanceof props in all namespaces
  protected instanceofIndex = new StartsWithIndex<string>(0, 0); // index to seacrh for the prop given an uri faster

  /** Get instanceof property of an entity identified by the given URI */
  public instanceof = (uri: string): string | undefined => {
    return this.instanceofIndex.get(uri);
  };

  /** Set instanceof property */
  public setInstanceOf = (instanceofProps: { [namespace: string]: string }) => {
    this.instanceofMapping = instanceofProps;
    this.instanceofProps = new Set(Object.values(instanceofProps));
    this.instanceofIndex = StartsWithIndex.fromMapping(this.instanceofMapping);
  };
}
