import { withStyles, WithStyles } from "@material-ui/styles";
import { Button, Form, Modal, Select, Space, Switch } from "antd";
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

      useEffect(() => {
        if (edge === undefined) return;
        if (propertyStore.getPropertyByURI(edge.uri) !== undefined) return;

        propertyStore.fetchOne({ conditions: { uri: edge.uri } });
      }, [propertyStore, edge, uri]);

      const onSave = () => {
        if (uri === undefined || source === undefined || target === undefined)
          return;
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

        sm.graph.addEdge({
          source: sourceId,
          target: targetId,
          uri: prop.uri,
          approximation,
          label: prop.readableLabel,
        });

        if (edge !== undefined) {
          // remove the old edge
          sm.graph.removeEdge(edge.source, edge.target);
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
          <Form.Item label="Source">
            <NodeSearchComponent
              sm={sm}
              value={source}
              onSelect={setSource}
              onDeselect={() => setSource(undefined)}
            />
          </Form.Item>
          <Form.Item label="Target">
            <NodeSearchComponent
              sm={sm}
              value={target}
              onSelect={setTarget}
              onDeselect={() => setTarget(undefined)}
            />
          </Form.Item>
          <Form.Item label="Predicate">
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
          <Form.Item label="Button">
            <Space>
              <Button
                type="primary"
                onClick={onSave}
                disabled={
                  source === undefined ||
                  target === undefined ||
                  uri === undefined ||
                  !isModified()
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
