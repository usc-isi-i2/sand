import { gold, green, purple, yellow } from "@ant-design/colors";
import { withStyles, WithStyles } from "@material-ui/styles";
import { Button, Divider, Popconfirm, Space } from "antd";
import { observer } from "mobx-react";
import React, { ReactElement, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  GraphComponent,
  GraphComponentFunc,
  GraphEdge,
  GraphNode,
} from "../../components/graph";
import { routes } from "../../routes";
import {
  DraftSemanticModel,
  SemanticModel,
  Table,
  useStores,
} from "../../models";
import { SMNode } from "../../models/sm";
import { openForm } from "./forms";
import { ReactComponent } from "rma-baseapp";
import { toJS } from "mobx";

const styles = {
  hide: {
    display: "none",
  },
  graphContainer: {
    marginTop: 8,
  },
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

export const SemanticModelComponent = withStyles(styles)(
  observer(
    ({
      classes,
      table,
      leftMenu,
    }: { table: Table; leftMenu: ReactElement } & WithStyles<
      typeof styles
    >) => {
      const graphRef = useRef<GraphComponentFunc | undefined>(undefined);
      const [currentIndex, setCurrentIndex] = useState(0);
      const { semanticModelStore, assistantService } = useStores();
      const sms = semanticModelStore.findByTable(table.id);
      const drafts = semanticModelStore.getCreateDraftsByTable(table);
      if (currentIndex >= sms.length + drafts.length) {
        // there is no semantic model & no draft for this table, create a new draft
        const id = semanticModelStore.getNewCreateDraftId(table);
        const draft = DraftSemanticModel.getDefaultDraftSemanticModel(
          id,
          `sm-${sms.length}`,
          table
        );
        semanticModelStore.setCreateDraft(draft);
        drafts.push(draft);
      }

      const sm =
        currentIndex < sms.length
          ? sms[currentIndex]
          : drafts[currentIndex - sms.length];

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

      // center the graph
      const centering = () => {
        if (graphRef.current === undefined) {
          return;
        }
        graphRef.current.recenter();
      };
      useHotkeys("c", centering, [sm.id, graphRef !== undefined]);

      // add model
      const cloneNewModel = () => {
        const id = semanticModelStore.getNewCreateDraftId(table);
        const nSms = sms.length + drafts.length;
        const draft = DraftSemanticModel.getDefaultDraftSemanticModel(
          id,
          semanticModelStore.getNewSemanticModelName(table),
          table
        );
        draft.graph = sm.graph.clone();
        draft.graph.id = id;
        semanticModelStore.setCreateDraft(draft);
        setCurrentIndex(nSms);
      };

      const onExport = () => {
        routes.tableExport
          .path({ tableId: table.id })
          .mouseClickNavigationHandler(undefined, true);
      };

      const smLists = [];
      for (let idx = 0; idx < sms.length + drafts.length; idx++) {
        const item = idx < sms.length ? sms[idx] : drafts[idx - sms.length];
        const isSelected = idx === currentIndex;
        smLists.push(
          <Button
            size="small"
            key={item.id}
            type={isSelected ? "primary" : "default"}
            onClick={() => setCurrentIndex(idx)}
            className={
              item.graph.stale || SemanticModel.isDraft(item)
                ? classes.draft +
                  (isSelected ? ` ${classes.selectedDraft}` : "")
                : ""
            }
          >
            {item.name}
          </Button>
        );
      }

      // only show the list of semantic models when we have more than one semantic model
      // or when we have some drafts or when the only semantic model is modified
      let smListComponent = undefined;
      smListComponent = (
        <Space style={{ float: "right" }}>
          {smLists.length !== 1 || drafts.length > 0 || sms[0].graph.stale ? (
            <React.Fragment>
              <span>Semantic Models:</span>
              {smLists}
              <Divider type="vertical" />
            </React.Fragment>
          ) : null}
          {/* reset is nice to have, but we didn't have the original copy... */}
          {/* {!sm.isDraft && sm.graph.stale ? (
            <Button size="small" onClick={() => openForm({ type: "edge", sm })}>
              Reset
            </Button>
          ) : null} */}
          {sms.length + drafts.length > 1 ? (
            <Popconfirm
              title="Are you sure to delete this model?"
              onConfirm={() => {
                if (SemanticModel.isDraft(sm)) {
                  semanticModelStore.deleteCreateDraft(sm.draftID);
                } else {
                  semanticModelStore.delete(sm.id);
                }
                setCurrentIndex(0);
              }}
              okText="Yes"
              cancelText="No"
            >
              <Button size="small" danger={true}>
                Delete model
              </Button>
            </Popconfirm>
          ) : null}
          {SemanticModel.isDraft(sm) || sm.graph.stale ? (
            <Button
              size="small"
              onClick={() =>
                SemanticModel.isDraft(sm)
                  ? semanticModelStore.create(sm)
                  : semanticModelStore.update(sm)
              }
            >
              Save model
            </Button>
          ) : null}

          <Button size="small" onClick={cloneNewModel}>
            Add model
          </Button>

          <Button size="small" type="primary" disabled={true}>
            Import
          </Button>
          <Button
            size="small"
            type="primary"
            style={{ background: green[6], borderColor: green[6] }}
            onClick={onExport}
          >
            Export
          </Button>
        </Space>
      );

      return (
        <div>
          {smListComponent}
          <Space>
            <Button size="small" onClick={centering}>
              Center graph (C)
            </Button>
            <Button size="small" onClick={() => openForm({ type: "node", sm })}>
              Add node
            </Button>
            <Button size="small" onClick={() => openForm({ type: "edge", sm })}>
              Add edge
            </Button>
            {leftMenu}
          </Space>
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
        </div>
      );
    }
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
