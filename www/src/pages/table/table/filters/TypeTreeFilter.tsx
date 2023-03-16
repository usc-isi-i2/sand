import { WithStyles, withStyles } from "@material-ui/styles";
import { Checkbox, Divider, Space, Tooltip, Typography } from "antd";
import { observer } from "mobx-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useStores } from "../../../../models";
import { Class } from "../../../../models/ontology/ClassStore";
import { OntClassSearchComponent } from "../../OntSearchComponent";
import { ColumnFilter } from "./Filter";

const styles = {
  treeNode: {},
  levelMarker: {},
  table: {
    "& th": {
      minWidth: 30,
      textAlign: "left",
    },
  },
};

/** Render a tree from the mappings */
export const TypeTreeFilter = withStyles(styles)(
  observer(
    ({
      types,
      classes,
      filter,
    }: {
      types: { [id: string]: Class };
      filter: ColumnFilter;
    } & WithStyles<typeof styles>) => {
      const [additionalTypeIds, setAdditionalTypeIds] = useState<string[]>([]);
      const [additionalTypes, setAdditionalTypes] = useState<
        Record<string, Class>
      >({});
      const [treeData, setTreeData] = useState<ReactNode[]>([]);
      const { classStore } = useStores();

      const additionalTypesKey = additionalTypeIds.sort().join("\t");
      useEffect(() => {
        classStore.fetchByIds(additionalTypeIds).then((classes) => {
          setAdditionalTypes(classes);
        });
      }, [additionalTypesKey]);

      useMemo(() => {
        const allTypes = { ...types, ...additionalTypes };
        // add types to the filter
        filter.addTypes(Object.keys(allTypes));

        // flatten the graph and store the data
        setTreeData(flattenGraph(allTypes, filter));
      }, [
        Object.keys(types).sort().join("\t"),
        Object.keys(additionalTypes).sort().join("\t"),
      ]);

      return (
        <>
          <table className={classes.table}>
            <thead>
              <tr>
                <th>
                  <Typography.Text type="secondary" strong={true}>
                    #
                  </Typography.Text>
                </th>
                <th>
                  <Tooltip title="Include: select rows that have a specific type">
                    <Typography.Text type="secondary" strong={true}>
                      In
                    </Typography.Text>
                  </Tooltip>
                </th>
                <th>
                  <Tooltip title="Exclude: select rows that do not have a specific type">
                    <Typography.Text type="secondary" strong={true}>
                      Ex
                    </Typography.Text>
                  </Tooltip>
                </th>
                <th>
                  <Typography.Text type="secondary" strong={true}>
                    Type
                  </Typography.Text>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td></td>
                <Tooltip
                  title="Select all checkbox in this `Include` column"
                  placement="left"
                >
                  <td>
                    <Checkbox
                      indeterminate={
                        filter.hasAnyOp("include") &&
                        !filter.hasAllOp("include")
                      }
                      checked={filter.hasAllOp("include")}
                      onChange={(e) =>
                        filter.toggleAllType("include", e.target.checked)
                      }
                    />
                  </td>
                </Tooltip>
                <Tooltip
                  title="Select all checkbox in this `Exclude` column"
                  placement="right"
                >
                  <td>
                    <Checkbox
                      indeterminate={
                        filter.hasAnyOp("exclude") &&
                        !filter.hasAllOp("exclude")
                      }
                      checked={filter.hasAllOp("exclude")}
                      onChange={(e) =>
                        filter.toggleAllType("exclude", e.target.checked)
                      }
                    />
                  </td>
                </Tooltip>
                <td>
                  <Typography.Text type="secondary">
                    (Select all)
                  </Typography.Text>
                </td>
              </tr>
              {treeData}
              <tr>
                <td colSpan={3} style={{ textAlign: "center", paddingTop: 8 }}>
                  <Typography.Text type="secondary">Add types</Typography.Text>
                </td>
                <td style={{ paddingTop: 8 }}>
                  <OntClassSearchComponent
                    mode="multiple"
                    value={additionalTypeIds}
                    onSelect={(id) =>
                      setAdditionalTypeIds(additionalTypeIds.concat([id]))
                    }
                    onDeselect={(id) =>
                      setAdditionalTypeIds(
                        additionalTypeIds.filter((x) => x !== id)
                      )
                    }
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <Divider style={{ margin: "8px 0" }} />
          <Space>
            <Typography.Text
              type="secondary"
              strong={true}
              title="Reset all filters"
              onClick={() => filter.toggleAllType("null", true)}
              style={{ cursor: "pointer" }}
            >
              Reset
            </Typography.Text>
            <Divider type="vertical" />
            <Tooltip
              title="Select rows containing NIL entities"
              placement="bottom"
            >
              <Typography.Text
                type="secondary"
                strong={true}
                onClick={() => filter.setSelectNil(!filter.selectNil)}
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                <Checkbox
                  checked={filter.selectNil}
                  onChange={(e) => filter.setSelectNil(e.target.checked)}
                />
                &nbsp;NIL Rows
              </Typography.Text>
            </Tooltip>
            <Divider type="vertical" />
            <Tooltip
              title="Select rows that do not link to any entity"
              placement="bottom"
            >
              <Typography.Text
                type="secondary"
                strong={true}
                onClick={() => filter.setSelectUnlinked(!filter.selectUnlinked)}
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                <Checkbox
                  checked={filter.selectUnlinked}
                  onChange={(e) => filter.setSelectUnlinked(e.target.checked)}
                />
                &nbsp;Unlinked Rows
              </Typography.Text>
            </Tooltip>
            <Divider type="vertical" />
            <Tooltip
              title="Applying filters to candidate entities"
              placement="bottom"
            >
              <Typography.Text
                type="secondary"
                strong={true}
                onClick={() =>
                  filter.setIncludeCandidateEntities(
                    !filter.includeCandidateEntities
                  )
                }
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                <Checkbox
                  checked={filter.includeCandidateEntities}
                  onChange={(e) =>
                    filter.setIncludeCandidateEntities(e.target.checked)
                  }
                />
                &nbsp;Candidate entities
              </Typography.Text>
            </Tooltip>
          </Space>
        </>
      );
    }
  )
);

export const TreeNode = withStyles(styles)(
  observer(
    ({
      nodeId,
      nodes,
      visited,
      unknown,
      depth,
      distance,
      counter,
      classes,
      filter,
    }: {
      nodeId: string;
      nodes: { [id: string]: Class };
      visited: number | undefined;
      unknown: boolean;
      depth: number;
      distance: number;
      counter: number;
      filter: ColumnFilter;
    } & WithStyles<typeof styles>) => {
      const title = nodes[nodeId]?.readableLabel || nodeId;

      let comp = [];

      if (depth === 0) {
        comp.push(<span key="2">{title}</span>);
      } else {
        let indent = "";
        for (let i = 1; i < depth; i++) {
          indent += "│&nbsp;&nbsp;&nbsp;";
        }

        comp.push(
          <code
            key="1"
            className={classes.levelMarker}
            dangerouslySetInnerHTML={{
              __html:
                distance === 1 ? `${indent}├──&nbsp;` : `${indent}├ ⸱⸱&nbsp;`,
            }}
          ></code>
        );
        comp.push(<span key="2">{title}</span>);
      }

      if (visited !== undefined) {
        comp.push(
          <Typography.Text
            key="visited"
            type="secondary"
            style={{ marginLeft: 4 }}
          >
            (visited at #{visited})
          </Typography.Text>
        );
      }

      if (unknown) {
        comp.push(
          <Typography.Text key="unk" type="secondary" style={{ marginLeft: 4 }}>
            (unknown)
          </Typography.Text>
        );
      }

      return (
        <tr className={classes.treeNode}>
          <td title="The index number of this type">
            <Typography.Text type="secondary">{counter}.</Typography.Text>
          </td>
          <td title="Select rows having entities of this type">
            {visited === undefined ? (
              <Checkbox
                checked={filter.type2op[nodeId] === "include"}
                onChange={(e) => {
                  filter.setTypeOp(
                    nodeId,
                    e.target.checked ? "include" : "null"
                  );
                }}
              />
            ) : null}
          </td>
          <td title="Select rows having entities that do not be part of this type">
            {visited === undefined ? (
              <Checkbox
                checked={filter.type2op[nodeId] === "exclude"}
                onChange={(e) => {
                  filter.setTypeOp(
                    nodeId,
                    e.target.checked ? "exclude" : "null"
                  );
                }}
              />
            ) : null}
          </td>
          <td>{comp}</td>
        </tr>
      );
    }
  )
);

/**
 * Flatten a type hierachy into a list of types. Because of lacking of distance
 * between a type and its ancestors, we cannot accurately put the type under closest
 * ancestors (also due to a type can have multiple parents). The algorithm is going to
 * put the type under the **deepest** ancestor available in the given list.
 *
 * @param types
 */
const flattenGraph = (types: { [id: string]: Class }, filter: ColumnFilter) => {
  const PARENT_DISTANCE = 1;
  const ANCESTOR_DISTANCE = 100;

  // construct graph
  let lstTypes = Object.values(types);

  const graph = new Graph<Class, number>();
  const type2node: { [id: string]: number } = {};
  const type2descendants: Record<string, string[]> = {};

  let type2parents: { [id: string]: Set<string> } = Object.fromEntries(
    lstTypes.map((t) => [t.id, new Set(t.parents)])
  );

  for (const type of lstTypes) {
    type2node[type.id] = graph.addNode(type);
  }
  for (const type of lstTypes) {
    for (const parent of type.parents) {
      if (types[parent] !== undefined) {
        graph.addEdge(type2node[parent], type2node[type.id], PARENT_DISTANCE);
      }
    }
  }

  for (const type of lstTypes) {
    let parents = new Set(type.parents);
    for (const ancestor of type.ancestors) {
      if (parents.has(ancestor) || types[ancestor] === undefined) {
        // don't add edge from the ancestor if it is a parent, it isn't available,
        continue;
      }
      if (type2descendants[ancestor] === undefined) {
        type2descendants[ancestor] = [];
      }
      type2descendants[ancestor].push(type.id);
    }
  }

  for (const typeId in type2descendants) {
    const children = graph
      .getOutEdges(type2node[typeId])
      .map((eid) => graph.getNodeData(graph.getEdgeTarget(eid)));
    const shortlistDescendants = type2descendants[typeId].filter((descendant) =>
      children.every((c) => !types[descendant].ancestors.has(c.id))
    );
    const validDescendants = shortlistDescendants.map(() => true);

    for (let i = 0; i < shortlistDescendants.length; i++) {
      for (let j = i + 1; j < shortlistDescendants.length; j++) {
        const desc1 = shortlistDescendants[i];
        const desc2 = shortlistDescendants[j];
        if (types[desc1].ancestors.has(desc2)) {
          // desc1 is an ancestor of desc2, remove desc2
          validDescendants[i] = false;
        } else if (types[desc2].ancestors.has(desc1)) {
          validDescendants[j] = false;
        }
      }
    }
    for (let i = 0; i < shortlistDescendants.length; i++) {
      if (validDescendants[i]) {
        graph.addEdge(
          type2node[typeId],
          type2node[shortlistDescendants[i]],
          ANCESTOR_DISTANCE
        );
      }
    }
  }

  // recursively flatten the graph
  const flattenTree: ReactNode[] = [];
  const counter: { value: number } = { value: 0 };
  const visitedNodes: (number | undefined)[] = [];

  function recurFlatten(nodeId: number, depth: number, distance: number) {
    const nodeData = graph.getNodeData(nodeId);
    counter.value += 1;
    flattenTree.push(
      <TreeNode
        key={`v-${counter.value}`}
        counter={counter.value}
        nodeId={nodeData.id}
        nodes={types}
        unknown={types[nodeData.id] === undefined} // whether the ontology class is unknown (parent maps to unknown entity -- database integrity issue)
        depth={depth}
        distance={distance}
        visited={visitedNodes[nodeId]}
        filter={filter}
      />
    );

    if (visitedNodes[nodeId] === undefined) {
      visitedNodes[nodeId] = counter.value;
      const outedges = graph.getOutEdges(nodeId);
      for (const edgeId of outedges) {
        // only recurse on the direct children as we want to always display it
        // for descendant, if it has been rendered before, we don't render it again
        const edgeData = graph.getEdgeData(edgeId);
        const targetId = graph.getEdgeTarget(edgeId);

        if (
          edgeData === PARENT_DISTANCE ||
          visitedNodes[targetId] === undefined
        ) {
          recurFlatten(targetId, depth + 1, edgeData);
        }
      }
    }
  }

  // start build the tree by dfs
  for (const rootId of graph.getRoots()) {
    recurFlatten(rootId, 0, PARENT_DISTANCE);
  }

  // the remaining nodes are part of cycles, we just pick a random node to start
  for (let i = 0; i < graph.getNumNodes(); i++) {
    if (visitedNodes[i] === undefined) {
      recurFlatten(i, 0, PARENT_DISTANCE);
    }
  }

  return flattenTree;
};

class Graph<V, E> {
  public nodes: {
    id: number;
    data: V;
    inedges: number[];
    outedges: number[];
  }[] = [];
  public edges: { id: number; source: number; target: number; data: E }[] = [];

  addNode(data: V): number {
    const id = this.nodes.length;
    this.nodes.push({ id, data, inedges: [], outedges: [] });
    return id;
  }

  addEdge(source: number, target: number, data: E): number {
    const id = this.edges.length;
    this.edges.push({ id, source, target, data });
    this.nodes[source].outedges.push(id);
    this.nodes[target].inedges.push(id);
    return id;
  }

  getNumNodes(): number {
    return this.nodes.length;
  }

  getRoots(): number[] {
    return this.nodes
      .filter((node) => node.inedges.length === 0)
      .map((node) => node.id);
  }

  getNodeData(nodeId: number): V {
    return this.nodes[nodeId].data;
  }

  getOutEdges(nodeId: number): number[] {
    return this.nodes[nodeId].outedges;
  }

  getEdgeTarget(edgeId: number): number {
    return this.edges[edgeId].target;
  }

  getEdgeData(edgeId: number): E {
    return this.edges[edgeId].data;
  }
}
