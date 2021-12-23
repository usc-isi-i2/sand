import { withStyles, WithStyles } from "@material-ui/styles";
import { Button, Space } from "antd";
import { useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  SemanticModel,
  Table,
  DraftSemanticModel,
  SMGraph,
  useStores,
} from "../../models";
import {
  GraphComponent,
  GraphComponentFunc,
  GraphEdge,
  GraphNode,
} from "../../components/graph";
import { gold, green, orange, purple, yellow } from "@ant-design/colors";
import { observer } from "mobx-react";

const styles = {
  hide: {
    display: "none",
  },
  graphContainer: {
    marginTop: 8,
  },
};

export const SemanticGraphComponent = withStyles(styles)(
  observer(
    ({
      sms,
      classes,
      table,
    }: { sms: SemanticModel[]; table: Table } & WithStyles<typeof styles>) => {
      const graphRef = useRef<GraphComponentFunc | undefined>(undefined);
      const [currentIndex, setCurrentIndex] = useState(0);
      const { semanticModelStore } = useStores();
      let sm = sms[currentIndex];
      let isSmDraft = false; // use flag instead of instanceof to avoid wrapped object by mobx

      if (currentIndex >= sms.length) {
        // sm is undefined, we need to create a draft semantic model
        // currently only support one draft
        const id = `${table.id}:draft`;
        let draftModel = semanticModelStore.getCreateDraft(id);
        if (draftModel === undefined) {
          draftModel = new DraftSemanticModel(
            id,
            `sm-${sms.length}`,
            "",
            0,
            new SMGraph(
              id,
              table.columns.map((column, index) => ({
                id: `col-${index}`,
                label: column,
                columnIndex: index,
                nodetype: "data_node",
              })),
              []
            ),
            table.id
          );
          semanticModelStore.setCreateDraft(draftModel);
        }
        sm = draftModel;
        isSmDraft = true;
      }

      const [nodes, edges] = useMemo(() => {
        const nodes = sm.graph.nodes.map((node) => {
          let shape: GraphNode["shape"], style;
          switch (node.nodetype) {
            case "class_node":
              shape = "circle";
              style = { fill: green[2], stroke: green[8] };
              break;
            case "data_node":
              shape = "rect";
              style = { fill: gold[3], stroke: gold[8] };
              break;
            case "literal_node":
              if (node.datatype === "entity-id") {
                shape = "circle";
              } else {
                shape = "rect";
              }
              if (node.isInContext) {
                style = { fill: "#C6E5FF", stroke: "#5B8FF9" };
              } else {
                style = { fill: purple[2], stroke: "#c41d7f" };
              }
              break;
            default:
              throw new Error(`Unreachable!`);
          }

          return {
            id: node.id,
            label: node.label,
            style,
            shape,
          };
        });
        const edges = sm.graph.edges.map((edge) => {
          return {
            id: `${edge.source}-${edge.target}-${edge.uri}`,
            source: edge.source,
            target: edge.target,
            label: edge.label,
          };
        });

        return [nodes, edges];
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [sm.id, sm.version]);

      const centering = () => {
        if (graphRef.current === undefined) {
          return;
        }
        graphRef.current.recenter();
      };
      useHotkeys("c", centering, [sm.id, graphRef !== undefined]);

      const smLists = [];
      for (const [idx, item] of sms.entries()) {
        smLists.push(
          <Button
            size="small"
            key={item.id}
            type={item.id === sm.id ? "primary" : "default"}
            onClick={() => setCurrentIndex(idx)}
          >
            {item.name}
          </Button>
        );
      }

      if (isSmDraft) {
        smLists.push(
          <Button
            size="small"
            key="draft"
            type="primary"
            style={{ backgroundColor: gold[5], borderColor: gold[7] }}
          >
            {sm.name}
          </Button>
        );
      }

      // only show the list of semantic models when we have more than one
      // or nothing and we are in the draft
      let smListComponent = undefined;
      if (smLists.length !== 1 || isSmDraft) {
        smListComponent = (
          <Space style={{ float: "right" }}>
            <span>Semantic Models:</span>
            {smLists}
          </Space>
        );
      }

      return (
        <div>
          {smListComponent}
          <Space>
            <Button size="small" onClick={centering}>
              Center graph (C)
            </Button>
            <Button size="small">Add model</Button>
            <Button size="small">Add node</Button>
            <Button size="small">Add edge</Button>
          </Space>
          <GraphComponent
            ref={graphRef}
            className={classes.graphContainer}
            id={sm.id}
            version={sm.version}
            nodes={nodes}
            edges={edges}
            toolbar={false}
            renderingAdjustedHeight={{ type: "fit-graph", extraHeight: 20 }}
            props={{
              initHeight: 300,
              layout: {
                type: "dagre",
                rankdir: "TB",
                nodesep: 50,
                ranksep: 15,
              },
              onNodeClick: (nodeId: string) => {
                console.log("click node", nodeId);
              },
              onEdgeClick: (edge: GraphEdge) => {
                console.log("click edge", edge);
              },
            }}
          />
        </div>
      );
    }
  )
);
