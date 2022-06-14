import { action, makeObservable, observable, toJS } from "mobx";
import { Resource } from "../entity";
import { appConfig } from "../settings";

export interface ClassNode {
  id: string;
  uri: string;
  // for class node only, telling if the class is an approximation
  approximation: boolean;
  // readable label in form of `{label} ({qnode id})`; not obtaining from URICount.
  label: string;
  readonly nodetype: "class_node";
}

export interface DataNode {
  id: string;
  // column name
  label: string;
  columnIndex: number;
  readonly nodetype: "data_node";
}

export type LiteralDataType = "entity-id" | "string";

export interface LiteralNode {
  id: string;
  /**
   * value of this literal node, depends on the type
   */
  value:
    | {
        type: "string";
        value: string;
      }
    | {
        type: "entity-id";
        id: string;
        uri: string;
      };
  // readable name for this node
  label: string;
  // whether this is a node in the context, apply for literal node only
  readonly isInContext: boolean;
  readonly nodetype: "literal_node";
}

export type SMNode = ClassNode | DataNode | LiteralNode;
export type SMNodeType = "class_node" | "data_node" | "literal_node";

export interface SMEdge {
  source: string;
  target: string;
  uri: string;
  approximation: boolean;
  label: string;
}

export class URICount {
  // a map from uri of nodes to the next available number
  private counter: { [uri: string]: number } = {};
  private id2num: { [id: string]: number } = {};

  constructor(nodes?: SMNode[]) {
    for (let node of nodes || []) {
      if (node.nodetype !== "class_node") continue;

      if (this.counter[node.uri] === undefined) {
        this.counter[node.uri] = 1;
      }
      this.id2num[node.id] = this.counter[node.uri];
      this.counter[node.uri] += 1;
    }
  }

  label = (node: SMNode) => {
    if (this.id2num[node.id] === undefined || this.id2num[node.id] === 1) {
      return node.label;
    }
    return `${node.label} ${this.id2num[node.id]}`;
  };

  nextLabel = (uri: string, label: string) => {
    if (this.counter[uri] === undefined) {
      return label;
    }
    return `${label} ${this.counter[uri]}`;
  };

  add = (node: ClassNode) => {
    if (this.counter[node.uri] === undefined) {
      this.counter[node.uri] = 1;
    }
    this.id2num[node.id] = this.counter[node.uri];
    this.counter[node.uri] += 1;
  };

  getNum = (node: ClassNode) => {
    return this.id2num[node.id];
  };
}

export class SMGraph {
  public id: string;
  public version: number;
  public nodes: SMNode[];
  public edges: SMEdge[];
  public stale: boolean; // if it is stale
  public nodeId2Index: { [id: string]: number } = {};
  public column2nodeIndex: { [columnIndex: number]: number } = {};
  public uriCount: URICount;

  constructor(id: string, nodes: SMNode[], edges: SMEdge[]) {
    this.id = id;
    this.version = 0;
    this.nodes = nodes;
    this.edges = edges;
    this.stale = false;

    this.buildIndex();
    this.uriCount = new URICount(this.nodes);

    makeObservable(this, {
      version: observable,
      nodes: observable,
      edges: observable,
      stale: observable,
      nodeId2Index: observable,
      column2nodeIndex: observable,
      uriCount: observable,
      addColumnRelationship: action,
      upsertColumnType: action,
      upsertRelationship: action,
      addDataNode: action,
      addClassNode: action,
      addLiteralNode: action,
      removeNode: action,
      updateClassNode: action,
      updateDataNode: action,
      updateLiteralNode: action,
      addEdge: action,
      removeEdge: action,
      updateEdge: action,
    });
  }

  /** Whether this graph is just containing all data nodes and no edges (it hasn't been modeled) */
  isEmpty = () => {
    return (
      this.edges.length === 0 &&
      this.nodes.every((node) => node.nodetype === "data_node")
    );
  };

  clone = () => {
    const record = this.toJS();
    return new SMGraph(this.id, record.nodes, record.edges);
  };

  onSave = () => {
    this.stale = false;
  };

  node = (id: string) => this.nodes[this.nodeId2Index[id]];
  hasNode = (id: string) => this.nodeId2Index[id] !== undefined;
  hasColumnIndex = (columnIndex: number) =>
    this.column2nodeIndex[columnIndex] !== undefined;
  nodesByURI = (uri: string) =>
    this.nodes.filter(
      (node) => node.nodetype === "class_node" && node.uri === uri
    );
  nodeByColumnIndex = (columnIndex: number): DataNode =>
    this.nodes[this.column2nodeIndex[columnIndex]] as DataNode;
  nodeByEntityId = (id: string): LiteralNode =>
    this.nodes.filter(
      (node) =>
        node.nodetype === "literal_node" &&
        node.value.type === "entity-id" &&
        node.value.id === id
    )[0] as LiteralNode;

  edge = (source: string, target: string) =>
    this.edges.filter((e) => e.source === source && e.target === target)[0];
  hasEdge = (source: string, target: string) =>
    this.edges.filter((e) => e.source === source && e.target === target)
      .length > 0;
  incomingEdges = (target: string) =>
    this.edges.filter((e) => e.target === target);
  outgoingEdges = (source: string) =>
    this.edges.filter((e) => e.source === source);

  nextNodeId = () => {
    for (let i = 0; i < this.nodes.length * 100; i++) {
      let nid = `c-${i}`;
      if (this.nodeId2Index[nid] === undefined) {
        return nid;
      }
    }
    throw new Error("Cannot find new id for a node");
  };

  public toJS() {
    return {
      nodes: toJS(this.nodes),
      edges: toJS(this.edges),
      nodeId2Index: toJS(this.nodeId2Index),
    };
  }

  /** Find all paths (max 2 hops) that connect two nodes */
  findPathMax2hops = (
    sourceId: string,
    targetId: string
  ): [SMEdge, SMEdge?][] => {
    let matchPaths: [SMEdge, SMEdge?][] = [];
    let outedges = this.outgoingEdges(sourceId);
    for (let outedge of outedges) {
      if (outedge.target === targetId) {
        matchPaths.push([outedge, undefined]);
        continue;
      }

      for (let outedge2 of this.outgoingEdges(outedge.target)) {
        if (outedge2.target === targetId) {
          matchPaths.push([outedge, outedge2]);
        }
      }
    }

    return matchPaths;
  };

  /**
   * Get the class node of an entity column. Undefined if the column is not an entity node
   * @param columnIndex
   * @returns
   */
  getClassIdOfColumnIndex = (columnIndex: number): string | undefined => {
    let inedges = this.incomingEdges(this.nodeByColumnIndex(columnIndex).id);
    for (let inedge of inedges) {
      if (appConfig.SEM_MODEL_IDENTS.has(inedge.uri)) {
        if (inedges.length > 1) {
          throw new Error(
            "Invalid semantic model. An entity column has two incoming edges"
          );
        }
        return inedge.source;
      }
    }
    return undefined;
  };

  getOutgoingProperties = (id: string): [SMEdge, SMEdge?][] => {
    let outprops: [SMEdge, SMEdge?][] = [];
    for (let outedge of this.outgoingEdges(id)) {
      let target = this.node(outedge.target);
      if (
        target.nodetype === "class_node" &&
        appConfig.SEM_MODEL_STATEMENTS.has(target.uri)
      ) {
        for (let coutedge of this.outgoingEdges(outedge.target)) {
          outprops.push([outedge, coutedge]);
        }
      } else {
        outprops.push([outedge, undefined]);
      }
    }
    return outprops;
  };

  /******************************************************************
   * Below is a list of operators that modify the graph. The index is rebuilt/modify
   * inside @action function
   ******************************************************************
   */

  /**
   * Add a link between two columns
   *
   * @deprecated
   * @param sourceColumnIndex
   * @param targetColumnIndex
   * @param edgeData
   */
  public addColumnRelationship(
    sourceColumnIndex: number,
    targetColumnIndex: number,
    edgeData: Omit<SMEdge, "source" | "target">
  ) {
    let source = this.nodeByColumnIndex(sourceColumnIndex);
    let target = this.nodeByColumnIndex(targetColumnIndex);

    let sourceIncomingEdges = this.incomingEdges(source.id);
    if (sourceIncomingEdges.length === 0) {
      throw new Error("Cannot add link from a data node to another node");
    }
    if (sourceIncomingEdges.length !== 1) {
      throw new Error(
        "The source column connects to multiple class nodes! Don't know the exact class node to choose"
      );
    }

    let targetIncomingEdges = this.incomingEdges(target.id);
    if (targetIncomingEdges.length > 1) {
      throw new Error(
        "The target column connects to multiple class nodes! Don't know the exact class node to choose"
      );
    }

    let realSource = sourceIncomingEdges[0].source;
    let realTarget =
      targetIncomingEdges.length === 0
        ? target.id
        : targetIncomingEdges[0].source;

    this.addEdge({
      ...edgeData,
      source: realSource,
      target: realTarget,
    });
  }

  /**
   * Upsert the type of the column: replace the type if exist otherwise, create the type including the
   * new class node.
   *
   * @param columnIndex
   * @param source
   */
  public upsertColumnType(columnIndex: number, source: Omit<ClassNode, "id">) {
    let target = this.nodeByColumnIndex(columnIndex);
    let targetIncomingEdges = this.incomingEdges(target.id);

    if (targetIncomingEdges.length > 1) {
      throw new Error(
        "The column connects to multiple class nodes! Don't know the exact class node to choose"
      );
    }

    if (targetIncomingEdges.length === 0) {
      let sourceId = this.nextNodeId();
      this.addClassNode({
        ...source,
        id: sourceId,
      });

      this.addEdge({
        source: sourceId,
        target: target.id,
        uri: "http://www.w3.org/2000/01/rdf-schema#label",
        label: "rdfs:label",
        approximation: false,
      });
    } else {
      let edge = targetIncomingEdges[0];
      this.updateClassNode(edge.source, source);
      if (edge.uri !== "http://www.w3.org/2000/01/rdf-schema#label") {
        // need to update the edge as well
        this.updateEdge(edge.source, edge.target, {
          uri: "http://www.w3.org/2000/01/rdf-schema#label",
          label: "rdfs:label",
          approximation: edge.approximation,
        });
      }
    }
  }

  /**
   * Upsert the relationship between two nodes: replace the type if exist otherwise create id.
   *
   * This is a special function as it tight the system to Wikidata with special node of
   * wikibase:Statement & property/qualifier. Assuming that the source node and target node
   * always exist.
   *
   * @param sourceId
   * @param targetId
   * @param pred1
   * @param pred2
   */
  public upsertRelationship(
    sourceId: string,
    targetId: string,
    pred1: Resource,
    pred2: Resource
  ) {
    // let source = this.node(sourceId);
    // let target = this.node(targetId);

    let matchPaths = this.findPathMax2hops(sourceId, targetId);

    if (matchPaths.length === 0) {
      // no new node, so we need to create it
      if (pred1.uri === pred2.uri) {
        // we just need to create one link
        this.addEdge({
          source: sourceId,
          target: targetId,
          uri: pred1.uri,
          label: pred1.label,
          approximation: false,
        });
      } else {
        let tempid = this.nextNodeId();
        this.addClassNode({
          id: tempid,
          uri: "http://wikiba.se/ontology#Statement",
          label: "wikibase:Statement",
          approximation: false,
          nodetype: "class_node",
        });
        this.addEdge({
          source: sourceId,
          target: tempid,
          uri: pred1.uri,
          label: pred1.label,
          approximation: false,
        });
        this.addEdge({
          source: tempid,
          target: targetId,
          uri: pred2.uri,
          label: pred2.label,
          approximation: false,
        });
      }
      return;
    }

    if (matchPaths.length > 1) {
      throw new Error(
        "There are more one path between two nodes. Don't know which path to update it"
      );
    }

    let [edge1, edge2] = matchPaths[0];
    this.updateEdge(edge1.source, edge1.target, {
      uri: pred1.uri,
      label: pred1.label,
      approximation: false,
    });
    if (edge2 !== undefined) {
      // non direct property, we need to update it as well
      this.updateEdge(edge2.source, edge2.target, {
        uri: pred2.uri,
        label: pred2.label,
        approximation: false,
      });
    }
  }

  /**
   * Add a data node to the model.
   */
  public addDataNode(node: DataNode) {
    if (this.nodeId2Index[node.id] !== undefined) {
      throw new Error("Duplicated id");
    }
    this.nodeId2Index[node.id] = this.nodes.length;
    this.nodes.push(node);
    this.version += 1;
    this.stale = true;
  }

  /**
   * Add a class node to the model.
   */
  public addClassNode(node: ClassNode) {
    if (this.nodeId2Index[node.id] !== undefined) {
      throw new Error("Duplicated id");
    }
    this.nodeId2Index[node.id] = this.nodes.length;
    this.nodes.push(node);
    this.uriCount.add(node);
    this.version += 1;
    this.stale = true;
  }

  /**
   * Add a literal node to the model
   */
  public addLiteralNode(node: LiteralNode) {
    if (this.nodeId2Index[node.id] !== undefined) {
      throw new Error("Duplicated id");
    }
    this.nodeId2Index[node.id] = this.nodes.length;
    this.nodes.push(node);
    this.version += 1;
    this.stale = true;
  }

  public removeNode(nodeId: string) {
    this._removeNode(nodeId);
    this.nodes = this.nodes.filter((n) => n !== undefined);
    this.buildIndex();
    this.version += 1;
    this.stale = true;
    this.uriCount = new URICount(this.nodes);
  }

  public updateClassNode(nodeId: string, props: Partial<ClassNode>) {
    let nodeIndex = this.nodeId2Index[nodeId];
    let node = this.nodes[nodeIndex];

    if (node.nodetype !== "class_node") {
      throw new Error(
        `Invalid node type. Expected class node but get ${node.nodetype}`
      );
    }
    Object.assign(node, props);
    this.version += 1;
    this.stale = true;
    if (props.uri !== undefined) {
      this.uriCount = new URICount(this.nodes);
    }
  }

  public updateLiteralNode(nodeId: string, props: Partial<LiteralNode>) {
    let nodeIndex = this.nodeId2Index[nodeId];
    let node = this.nodes[nodeIndex];

    if (node.nodetype !== "literal_node") {
      throw new Error(
        `Invalid node type. Expected literal node but get ${node.nodetype}`
      );
    }
    Object.assign(node, props);
    this.version += 1;
    this.stale = true;
  }

  public updateDataNode(nodeId: string, props: Partial<DataNode>) {
    let nodeIndex = this.nodeId2Index[nodeId];
    let node = this.nodes[nodeIndex];

    if (node.nodetype !== "data_node") {
      throw new Error(
        `Invalid node type. Expected data node but get ${node.nodetype}`
      );
    }
    Object.assign(node, props);
    this.version += 1;
    this.stale = true;
  }

  public addEdge(edge: SMEdge) {
    if (this.hasEdge(edge.source, edge.target)) {
      throw new Error("Cannot have more than one edge between two nodes");
    }

    this.edges.push(edge);
    this.version += 1;
    this.stale = true;
  }

  public removeEdge(sourceId: string, targetId: string) {
    let size = this.nodes.length;
    this._removeEdge(sourceId, targetId);
    this.nodes = this.nodes.filter((n) => n !== undefined);

    if (this.nodes.length !== size) {
      this.buildIndex();
      this.uriCount = new URICount(this.nodes);
    }
    this.version += 1;
    this.stale = true;
  }

  public updateEdge(source: string, target: string, props: Partial<SMEdge>) {
    for (let i = 0; i < this.edges.length; i++) {
      let edge = this.edges[i];
      if (edge.source === source && edge.target === target) {
        this.edges[i] = { ...this.edges[i], ...props };
      }
    }
    this.version = (this.version || 0) + 1;
    this.stale = true;
  }

  /**
   * Cascading remove nodes in the graph. To avoid rebuilding the index
   * everytime we delete a node, we replace the deleted node by undefined.
   * A post process step is needed to filter out all undefined items in the list
   */
  private _removeNode = (nodeId: string) => {
    if (
      this.nodeId2Index[nodeId] === undefined ||
      this.nodes[this.nodeId2Index[nodeId]] === undefined
    ) {
      return;
    }

    let nodeIndex = this.nodeId2Index[nodeId];
    let node = this.nodes[nodeIndex];

    if (
      node.nodetype === "data_node" ||
      (node.nodetype === "literal_node" && node.isInContext)
    ) {
      // don't remove data nodes && context node;
      return;
    }

    // remove node by mark it undefined
    (this.nodes[nodeIndex] as any) = undefined;

    // we need to remove other edges connected to this node
    let edges = this.edges.filter(
      (edge) => edge.source === nodeId || edge.target === nodeId
    );
    for (let edge of edges) {
      this._removeEdge(edge.source, edge.target);
    }
  };

  /**
   * Cascading remove edges in the graph
   */
  private _removeEdge = (sourceId: string, targetId: string) => {
    let edgeIndex = undefined;
    let sourceDegree = 0;
    let targetDegree = 0;

    for (let i = 0; i < this.edges.length; i++) {
      let edge = this.edges[i];
      if (edge.source === sourceId && edge.target === targetId) {
        edgeIndex = i;
      }
      if (edge.source === sourceId || edge.target === sourceId) {
        sourceDegree += 1;
      }
      if (edge.source === targetId || edge.target === targetId) {
        targetDegree += 1;
      }
    }

    if (edgeIndex === undefined) {
      return;
    }

    // remove edge
    this.edges.splice(edgeIndex, 1);

    // if a node only has one connection, so we delete it because now it is lonely, except if it is
    // a data node
    if (sourceDegree === 1) {
      this._removeNode(sourceId);
    }
    if (targetDegree === 1) {
      this._removeNode(targetId);
    }
  };

  private buildIndex = () => {
    this.nodeId2Index = {};
    this.column2nodeIndex = {};

    for (let i = 0; i < this.nodes.length; i++) {
      let n = this.nodes[i];
      this.nodeId2Index[n.id] = i;
      if (n.nodetype === "data_node" && n.columnIndex !== null) {
        this.column2nodeIndex[n.columnIndex] = i;
      }
    }
  };
}
