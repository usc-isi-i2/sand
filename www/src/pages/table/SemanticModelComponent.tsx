import { gold, green, purple, yellow } from "@ant-design/colors";
import { withStyles, WithStyles } from "@material-ui/styles";
import { observer } from "mobx-react";
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import {
  GraphComponent,
  GraphComponentFunc,
  GraphEdge,
  GraphNode,
} from "../../components/graph";
import { SemanticModel, Table } from "../../models";
import { SMNode } from "../../models/sm";
import { openForm } from "./forms";

const styles = {
  hide: {
    display: "none",
  },
  graphContainer: {},
  draft: {
    border: `1px dashed ${yellow[7]} !important`,
    "&:hover": {
      color: `${gold[5]} !important`,
    },
  },
  selectedDraft: {
    backgroundColor: `${gold[5]} !important`,
  },
};

export interface SemanticModelComponentFunc {
  recenter: () => boolean;
}

export const SemanticModelComponent = withStyles(styles)(
  observer(
    forwardRef(
      (
        {
          classes,
          table,
          sm,
        }: { table: Table; sm: SemanticModel } & WithStyles<typeof styles>,
        ref
      ) => {
        const graphRef = useRef<GraphComponentFunc>();

        // expose the APIs for the control bar to call
        useImperativeHandle(
          ref,
          (): SemanticModelComponentFunc => ({
            recenter: () => graphRef.current?.recenter() || false,
          })
        );

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
                if (node.value.type === "entity-id") {
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
              label: getNodeLabel(sm, node),
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
        }, [
          SemanticModel.isDraft(sm) ? sm.draftID : null,
          sm.id,
          sm.graph.version,
        ]);

        return (
          <GraphComponent
            ref={graphRef}
            className={classes.graphContainer}
            id={sm.id}
            version={sm.graph.version}
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
                openForm({
                  type: "node",
                  sm,
                  node: sm.graph.node(nodeId),
                });
              },
              onEdgeClick: (edge: GraphEdge) => {
                openForm({
                  type: "edge",
                  sm,
                  edge: sm.graph.edge(edge.source, edge.target),
                });
              },
            }}
          />
        );
      }
    )
  )
);

const getNodeLabel = (sm: SemanticModel, node: SMNode) => {
  switch (node.nodetype) {
    case "data_node":
      return node.label;
    case "literal_node":
      return node.label;
    case "class_node":
      return sm.graph.uriCount.label(node);
  }
};
