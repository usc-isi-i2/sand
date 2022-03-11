import { withStyles, WithStyles } from "@material-ui/styles";
import { Button, Form, Modal, Select, Space, Switch, Typography } from "antd";
import { observer } from "mobx-react";
import { useEffect, useMemo, useState } from "react";
import { SemanticModel, SMEdge, useStores } from "../../../models";
import { NodeSearchComponent, SearchValue } from "../NodeSearchComponent";
import { OntPropSearchComponent } from "../OntSearchComponent";

const styles = {
  table: {
    width: "100%",
    textAlign: "left",
    borderSpacing: 0,
    borderRadius: "2px 2px 0 0",

    "& tr": {
      verticalAlign: "middle",
    },
    "& th, td": {
      padding: "0 4px",
    },
  },
  selection: {
    width: "100%",
  },
} as const;

export const NodeSelectionComponent = withStyles(styles)(
  observer(
    ({
      sm,
      classes,
      value,
      onSelect,
      onDeselect,
    }: {
      sm: SemanticModel;
      value?: string;
      onDeselect?: (value: string) => void;
      onSelect?: (value: string) => void;
    } & WithStyles<typeof styles>) => {
      // gather all options already in the store, leverage the fact
      // that property store is readonly
      const options = useMemo(() => {
        return sm.graph.nodes.map((node) => {
          return {
            value: node.id,
            label: node.label,
          };
        });
      }, [sm]);

      return (
        <Select
          showSearch={true}
          allowClear={true}
          options={options}
          optionFilterProp="label"
          className={classes.selection}
          value={value}
          onSelect={onSelect as any}
          onDeselect={onDeselect as any}
        />
      );
    }
  )
);

export type EdgeFormProps = {
  sm: SemanticModel;
  edge?: SMEdge;
};

export const EdgeForm = withStyles(styles)(
  observer(
    ({ sm, edge, classes }: EdgeFormProps & WithStyles<typeof styles>) => {
      const { classStore, propertyStore } = useStores();
      const [source, setSource] = useState<SearchValue | undefined>(
        edge !== undefined
          ? { type: sm.graph.node(edge.source).nodetype, id: edge.source }
          : undefined
      );
      const [target, setTarget] = useState<SearchValue | undefined>(
        edge !== undefined
          ? { type: sm.graph.node(edge.target).nodetype, id: edge.target }
          : undefined
      );
      const [uri, setURI] = useState<string | undefined>(edge?.uri);
      const [approximation, setApproximation] = useState(false);

      // whether there exists an edge between source & target
      // if yes, we can't insert because we assume only one relationship
      // between two nodes
      const dupEdge = useMemo(() => {
        if (source === undefined || source.type === "class") return false;
        if (target === undefined || target.type === "class") return false;
        return (
          sm.graph.hasEdge(source.id, target.id) &&
          (edge === undefined ||
            source.id !== edge.source ||
            target.id !== edge.target)
        );
      }, [sm.graph.version, source?.id, target?.id]);

      useEffect(() => {
        if (edge === undefined) return;
        if (propertyStore.getPropertyByURI(edge.uri) !== undefined) return;

        propertyStore.fetchOne({ conditions: { uri: edge.uri } });
      }, [propertyStore, edge, uri]);

      const onSave = () => {
        if (uri === undefined || source === undefined || target === undefined)
          return;
        if (dupEdge) return;

        const prop = propertyStore.getPropertyByURI(uri)!;
        let sourceId, targetId;

        if (source.type === "class") {
          const cls = classStore.get(source.id)!;
          sourceId = sm.graph.nextNodeId();
          sm.graph.addClassNode({
            id: sourceId,
            uri: cls.uri,
            label: cls.readableLabel,
            approximation: false,
            nodetype: "class_node",
          });
        } else {
          sourceId = source.id;
        }

        if (target.type === "class") {
          const cls = classStore.get(target.id)!;
          targetId = sm.graph.nextNodeId();
          sm.graph.addClassNode({
            id: targetId,
            uri: cls.uri,
            label: cls.readableLabel,
            approximation: false,
            nodetype: "class_node",
          });
        } else {
          targetId = target.id;
        }

        const newEdge = {
          source: sourceId,
          target: targetId,
          uri: prop.uri,
          approximation,
          label: prop.readableLabel,
        };
        if (edge !== undefined) {
          if (edge.source === sourceId && edge.target === targetId) {
            sm.graph.updateEdge(edge.source, edge.target, newEdge);
          } else {
            sm.graph.removeEdge(edge.source, edge.target);
            sm.graph.addEdge(newEdge);
          }
        } else {
          sm.graph.addEdge(newEdge);
        }

        Modal.destroyAll();
      };

      const onDelete = () => {
        if (edge === undefined) return;
        sm.graph.removeEdge(edge.source, edge.target);
        Modal.destroyAll();
      };

      const isModified = () => {
        return (
          edge === undefined ||
          source?.id !== edge.source ||
          target?.id !== edge.target ||
          uri !== edge.uri ||
          approximation !== edge.approximation
        );
      };

      return (
        <Form
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          labelWrap={true}
          layout="horizontal"
        >
          <Form.Item
            label={
              <Typography.Text
                copyable={
                  source !== undefined ? { text: source.id } : undefined
                }
              >
                Source
              </Typography.Text>
            }
            validateStatus={dupEdge ? "error" : undefined}
            help={
              dupEdge
                ? "Cannot have more than one edge between two nodes"
                : undefined
            }
          >
            <NodeSearchComponent
              sm={sm}
              value={source}
              onSelect={setSource}
              onDeselect={() => setSource(undefined)}
            />
          </Form.Item>
          <Form.Item
            label={
              <Typography.Text
                copyable={
                  target !== undefined ? { text: target.id } : undefined
                }
              >
                Target
              </Typography.Text>
            }
          >
            <NodeSearchComponent
              sm={sm}
              value={target}
              onSelect={setTarget}
              onDeselect={() => setTarget(undefined)}
            />
          </Form.Item>
          <Form.Item
            label={
              <Typography.Text
                copyable={
                  uri !== undefined
                    ? { text: propertyStore.getPropertyByURI(uri)?.id }
                    : undefined
                }
              >
                Predicate
              </Typography.Text>
            }
          >
            <OntPropSearchComponent
              value={
                uri !== undefined
                  ? propertyStore.getPropertyByURI(uri)?.id
                  : undefined
              }
              onSelect={(id) => setURI(propertyStore.get(id)?.uri)}
              onDeselect={(value) => setURI(undefined)}
            />
          </Form.Item>
          <Form.Item label="Approximation">
            <Switch
              checked={approximation}
              onChange={(val) => setApproximation(val)}
            />
          </Form.Item>
          <Form.Item label="&nbsp;" colon={false}>
            <Space>
              <Button
                type="primary"
                onClick={onSave}
                disabled={
                  source === undefined ||
                  target === undefined ||
                  uri === undefined ||
                  !isModified() ||
                  dupEdge
                }
              >
                Save
              </Button>
              {edge !== undefined ? (
                <Button type="primary" danger={true} onClick={onDelete}>
                  delete
                </Button>
              ) : null}
            </Space>
          </Form.Item>
        </Form>
      );
    }
  )
);
