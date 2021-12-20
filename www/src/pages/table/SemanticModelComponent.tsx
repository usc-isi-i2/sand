import { withStyles, WithStyles } from "@material-ui/styles";
import { Button, Space } from "antd";
import { useMemo, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { SemanticModel } from "../../models";
import {
  GraphComponent as GC,
  GraphComponentFunc,
  GraphEdge,
  GraphNode,
} from "../../components/graph";
import { gold, green, purple } from "@ant-design/colors";

const styles = {
  hide: {
    display: "none",
  },
  graphContainer: {
    marginTop: 8,
  },
};

export const SemanticGraphComponent = withStyles(styles)(
  ({ sm, classes }: { sm: SemanticModel } & WithStyles<typeof styles>) => {
    const graphRef = useRef<GraphComponentFunc | undefined>(undefined);

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
      const graph = graphRef.current.graph();
      if (graph === undefined) {
        return;
      }
      graph.updateContainerSize({ center: true, height: "fit-graph" });
    };
    useHotkeys("c", centering, [sm.id, graphRef !== undefined]);

    return (
      <div>
        <Space>
          <Button size="small" onClick={centering}>
            Center graph (C)
          </Button>
          <Button size="small">Add node</Button>
          <Button size="small">Add edge</Button>
        </Space>
        <GC
          ref={graphRef}
          className={classes.graphContainer}
          id={sm.id}
          version={sm.version}
          nodes={nodes}
          edges={edges}
          toolbar={false}
          renderingAdjustedHeight="fit-graph"
          props={{
            initHeight: 300,
            leftOffset: 0,
            layout: {
              type: "dagre",
              rankdir: "TB",
              nodesep: 70,
              ranksep: 30,
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
);
