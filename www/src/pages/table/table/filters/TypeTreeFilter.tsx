import { WithStyles, withStyles } from "@material-ui/styles";
import { Checkbox, Divider, Space, Tooltip, Typography } from "antd";
import { observer } from "mobx-react";
import { ReactNode, useMemo, useState } from "react";
import { Class } from "../../../../models/ontology/ClassStore";
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
      const [treeData, setTreeData] = useState<ReactNode[]>([]);

      useMemo(() => {
        // construct parent to children mapping
        const p2cs = Object.fromEntries(
          Object.keys(types).map((id) => [id, new Set<string>()])
        );
        for (const type of Object.values(types)) {
          for (const parentTypeId of type.parents) {
            if (types[parentTypeId] !== undefined) {
              p2cs[parentTypeId].add(type.id);
            }
          }
        }

        // get list of roots to start with
        const rootIds = new Set(Object.keys(p2cs));
        for (const [_parent, children] of Object.entries(p2cs)) {
          for (const child of children) {
            rootIds.delete(child);
          }
        }

        // traveling the mapping to build the flatten tree
        filter.addTypes(Object.keys(types));

        const args = {
          start: "",
          nodes: types,
          p2cs: p2cs,
          visited: {} as { [id: string]: number },
          counter: 0,
          filter: filter,
        };
        const treeNodes: ReactNode[] = [];

        for (const rootId of rootIds) {
          args.start = rootId;
          travel2constructTreeNodes(args, treeNodes);
        }

        // the remaining nodes are part of cycles, we just pick a random node to start
        for (const nodeId in p2cs) {
          if (args.visited[nodeId] === undefined) {
            args.start = nodeId;
            travel2constructTreeNodes(args, treeNodes);
          }
        }

        setTreeData(treeNodes);
      }, [Object.keys(types).sort().join("\t")]);

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
      counter,
      classes,
      filter,
    }: {
      nodeId: string;
      nodes: { [id: string]: Class };
      visited: number | undefined;
      unknown: boolean;
      depth: number;
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
            dangerouslySetInnerHTML={{ __html: `${indent}├──&nbsp;` }}
          ></code>
        );
        comp.push(<span key="2">{title}</span>);
      }

      if (visited !== undefined) {
        comp.push(
          <Typography.Text type="secondary" style={{ marginLeft: 4 }}>
            (visited at #{visited})
          </Typography.Text>
        );
      }

      if (unknown) {
        comp.push(
          <Typography.Text type="secondary" style={{ marginLeft: 4 }}>
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

const travel2constructTreeNodes = (
  args: {
    start: string;
    nodes: { [id: string]: Class };
    p2cs: { [id: string]: Set<string> };

    visited: { [node: string]: number };
    counter: number;
    filter: ColumnFilter;
  },
  outputs: ReactNode[]
) => {
  const stack: [string, number][] = [[args.start, 0]];
  while (stack.length > 0) {
    args.counter += 1;
    const [nodeId, depth] = stack.pop()!;
    outputs.push(
      <TreeNode
        key={args.counter}
        counter={args.counter}
        nodeId={nodeId}
        nodes={args.nodes}
        unknown={args.nodes[nodeId] === undefined}
        depth={depth}
        visited={args.visited[nodeId]}
        filter={args.filter}
      />
    );

    if (args.visited[nodeId] === undefined) {
      args.visited[nodeId] = args.counter;
      for (const child of args.p2cs[nodeId]) {
        stack.push([child, depth + 1]);
      }
    }
  }
};
