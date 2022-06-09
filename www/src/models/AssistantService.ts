import axios, { AxiosResponse } from "axios";
import { Record, RStore } from "gena-app";
import { action, flow, makeObservable } from "mobx";
import { CancellablePromise } from "mobx/dist/api/flow";
import { SERVER } from "../env";
import { Table, TableRowStore, TableStore } from "../models/table";
import { EntityStore } from "./entity";
import { Class, ClassStore } from "./ontology/ClassStore";
import { Property } from "./ontology/Property";
import { PropertyStore } from "./ontology/PropertyStore";
import { appConfig } from "./settings";
import { DraftSemanticModel, SemanticModelStore } from "./sm";

interface AssistantRecord extends Record<number> {}

interface Prediction {
  [algorithm: string]: {
    sm: any;
    rows: any[];
  };
}

export class AssistantService extends RStore<number, AssistantRecord> {
  protected tables: TableStore;
  protected rows: TableRowStore;
  protected smStore: SemanticModelStore;
  protected entityStore: EntityStore;
  protected classStore: ClassStore;
  protected propStore: PropertyStore;

  constructor(
    tableStore: TableStore,
    tableRowStore: TableRowStore,
    smStore: SemanticModelStore,
    classStore: ClassStore,
    propStore: PropertyStore,
    entityStore: EntityStore
  ) {
    super(`${SERVER}/api/assistant`, undefined, false, []);

    this.tables = tableStore;
    this.rows = tableRowStore;
    this.smStore = smStore;
    this.classStore = classStore;
    this.propStore = propStore;
    this.entityStore = entityStore;

    makeObservable(this, {
      predict: action,
      getColumnTypes: action,
      getColumnProperties: action,
      getColumnTypesServer: action,
    });
  }

  /**
   * Predict semantic description and entity linking
   * */
  predict: (table: Table) => CancellablePromise<void> = flow(function* (
    this: AssistantService,
    table: Table
  ) {
    // send request to the server to get some suggestions
    const resp: AxiosResponse<Prediction> = yield axios.get(
      `${this.remoteURL}/predict/${table.id}`,
      {
        params: { algorithm: "mtab" },
      }
    );

    // deserialzie the results and put it back to the store
    const rawsm = resp.data.mtab.sm;
    const rawrows = resp.data.mtab.rows;

    const draftId = this.smStore.getNewCreateDraftId(table);
    const graph = this.smStore.deserialize({
      data: rawsm,
      id: "",
    }).graph;

    // before set a new draft, check if an empty draft is there (as default) and remove it
    const prevDrafts = this.smStore.getCreateDraftsByTable(table);
    if (prevDrafts.length === 1 && prevDrafts[0].graph.isEmpty()) {
      this.smStore.deleteCreateDraft(prevDrafts[0].draftID);
    }

    const name = this.smStore.getNewSemanticModelName(table);
    this.smStore.setCreateDraft(
      new DraftSemanticModel(draftId, name, "", 0, graph, table.id)
    );

    const rows = rawrows.map(this.rows.deserialize);
    for (const row of rows) {
      this.rows.set(row);
    }
    return;
  });

  /**
   * Get column types from entities in the column. This algorithm is implemented in the client side
   */
  async getColumnTypes(
    table: Table,
    columnIndex: number,
    includeCandidateEntities: boolean
  ): Promise<{ [id: string]: Class }> {
    const rows = await this.rows.fetchByTable(table, 0, table.size);

    // fetch all entities
    const entIds = new Set<string>();
    for (const row of rows) {
      for (const link of row.links[columnIndex] || []) {
        if (
          link.entityId !== undefined &&
          link.entityId !== appConfig.NIL_ENTITY
        ) {
          entIds.add(link.entityId);
        }

        if (includeCandidateEntities) {
          for (const candidate of link.candidateEntities) {
            entIds.add(candidate.entityId);
          }
        }
      }
    }

    const ents = await this.entityStore.fetchByIds(Array.from(entIds));

    // fetch all classes from entities as well as from the semantic models
    const classIds = new Set<string>();
    for (const ent of Object.values(ents)) {
      const instanceofProp = appConfig.instanceof(ent.uri);
      if (
        instanceofProp === undefined ||
        ent.properties[instanceofProp] === undefined
      ) {
        continue;
      }

      for (const stmt of ent.properties[instanceofProp]) {
        if (stmt.value.type === "entityid") {
          const classId = stmt.value.value;
          classIds.add(classId);
        }
      }
    }

    const classes = await this.classStore.fetchByIds(Array.from(classIds));

    // add some classes from the semantic models
    const sms = this.smStore
      .findByTable(table.id)
      .concat(this.smStore.getCreateDraftsByTable(table));
    const additionalURIs: Set<string> = new Set();
    for (const sm of sms) {
      const classId = sm.graph.getClassIdOfColumnIndex(columnIndex);
      if (classId !== undefined) {
        const node = sm.graph.node(classId);
        if (node.nodetype === "class_node") {
          additionalURIs.add(node.uri);
        }
      }
    }
    for (const klass of await Promise.all(
      Array.from(additionalURIs).map(
        this.classStore.fetchIfMissingByURI.bind(this.classStore)
      )
    )) {
      if (klass === undefined) continue;
      classes[klass.id] = klass;
    }

    return classes;
  }

  /**
   * Get properties of entities in the column. This algorithm is implemented in the client side
   */
  async getColumnProperties(
    table: Table,
    columnIndex: number,
    includeCandidateEntities: boolean
  ): Promise<{ [id: string]: Property }> {
    const rows = await this.rows.fetchByTable(table, 0, table.size);

    // fetch all entities
    const entIds = new Set<string>();
    for (const row of rows) {
      for (const link of row.links[columnIndex] || []) {
        if (
          link.entityId !== undefined &&
          link.entityId !== appConfig.NIL_ENTITY
        ) {
          entIds.add(link.entityId);
        }

        if (includeCandidateEntities) {
          for (const candidate of link.candidateEntities) {
            entIds.add(candidate.entityId);
          }
        }
      }
    }

    const ents = await this.entityStore.fetchByIds(Array.from(entIds));

    // fetch all properties from entities as well as from the semantic models
    const propIds = new Set<string>();
    for (const ent of Object.values(ents)) {
      for (const [propId, stmts] of Object.entries(ent.properties)) {
        propIds.add(propId);

        for (const stmt of stmts) {
          for (const qualId of stmt.qualifiersOrder) {
            propIds.add(qualId);
          }
        }
      }
    }

    const props = await this.propStore.fetchByIds(Array.from(propIds));

    // add some properties from the semantic models
    const sms = this.smStore
      .findByTable(table.id)
      .concat(this.smStore.getCreateDraftsByTable(table));
    const additionalURIs: Set<string> = new Set();
    for (const sm of sms) {
      const classId = sm.graph.getClassIdOfColumnIndex(columnIndex);
      if (classId !== undefined) {
        const node = sm.graph.node(classId);
        if (node.nodetype === "class_node") {
          for (const edge of sm.graph.outgoingEdges(node.id)) {
            additionalURIs.add(edge.uri);
          }
        }
      }
    }
    for (const prop of await Promise.all(
      Array.from(additionalURIs).map(
        this.propStore.fetchIfMissingByURI.bind(this.propStore)
      )
    )) {
      if (prop === undefined) continue;
      props[prop.id] = prop;
    }

    return props;
  }

  /**
   * Get column types from entities in the column.
   * This algorithm calls the function implemented in the server, therefore, it does not have the candidate entities.
   */
  async getColumnTypesServer(
    table: Table,
    columnIndex: number
  ): Promise<{ [id: string]: Set<string> }> {
    const req = axios.post(`${this.remoteURL}/column-types`, {
      table: table.id,
      column: columnIndex,
    });

    const sms = this.smStore
      .findByTable(table.id)
      .concat(this.smStore.getCreateDraftsByTable(table));
    const additionalURIs: Set<string> = new Set();

    for (const sm of sms) {
      const classId = sm.graph.getClassIdOfColumnIndex(columnIndex);
      if (classId !== undefined) {
        const node = sm.graph.node(classId);
        if (node.nodetype === "class_node") {
          additionalURIs.add(node.uri);
        }
      }
    }

    const resp: AxiosResponse<{ [id: string]: string[] }> = await req;
    const tree = Object.fromEntries(
      Object.entries(resp.data).map((value) => [value[0], new Set(value[1])])
    );

    // gather the list of additional classes and add them to the tree
    const existingClasses = Object.values(
      await this.classStore.fetchByIds(Object.keys(tree))
    );
    const classes = Object.fromEntries(
      (
        await Promise.all(
          Array.from(additionalURIs).map(
            this.classStore.fetchIfMissingByURI.bind(this.classStore)
          )
        )
      )
        .filter((klass) => klass !== undefined)
        .map((klass) => [klass!.id, klass!])
    );

    for (const klass of Object.values(classes)) {
      if (tree[klass.id] === undefined) {
        tree[klass.id] = new Set();
        for (const parent of klass.parents) {
          if (tree[parent] !== undefined) {
            tree[parent].add(klass.id);
          }
        }
      }
    }

    // we need to check if any of the additional URIs have children which are already in the tree, so we
    // can add them correctly
    for (const klass of existingClasses) {
      for (const parent of klass.parents) {
        if (classes[parent] !== undefined) {
          tree[parent].add(klass.id);
        }
      }
    }

    return tree;
  }
}
