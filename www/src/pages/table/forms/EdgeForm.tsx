import { withStyles, WithStyles } from "@material-ui/styles";
import { Button, Form, Input, Modal, Radio, Select, Space, Switch } from "antd";
import { toJS } from "mobx";
import { observer } from "mobx-react";
import { useEffect, useMemo, useState } from "react";
import { SequentialFuncInvoker } from "../../../misc";
import { SemanticModel, useStores, GraphEdge, Property } from "../../../models";
import { SMNode } from "../../../models/sm";
import {
  OntClassSearchComponent,
  OntPropSearchComponent,
} from "../OntSearchComponent";

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
  edge?: GraphEdge;
};

export const EdgeForm = withStyles(styles)(
  observer(
    ({ sm, edge, classes }: EdgeFormProps & WithStyles<typeof styles>) => {
      const { propertyStore } = useStores();
      const [source, setSource] = useState<string | undefined>(edge?.source);
      const [target, setTarget] = useState<string | undefined>(edge?.target);
      const [predicate, setPredicate] = useState<string | undefined>(
        edge === undefined
          ? undefined
          : propertyStore.getPropertyByURI(edge.uri)?.id
      );
      const [approximation, setApproximation] = useState(false);

      useEffect(() => {
        if (edge === undefined) {
          return;
        }

        if (propertyStore.getPropertyByURI(edge.uri) === undefined) {
          propertyStore
            .fetchOne({
              conditions: { uri: edge.uri },
            })
            .then((prop: Property | undefined) => {
              if (prop === undefined) return;
              setPredicate(prop.id);
            });
        }
      }, [edge, predicate]);

      const isValid = () => {
        return (
          source !== undefined &&
          target !== undefined &&
          predicate !== undefined
        );
      };

      const save = () => {
        if (!isValid()) return;
        const prop = propertyStore.get(predicate!)!;

        sm.graph.addEdge({
          source: source!,
          target: target!,
          uri: prop.uri,
          approximation,
          label: prop.label,
        });

        Modal.destroyAll();
      };

      const remove = () => {
        if (edge === undefined) return;
        sm.graph.removeEdge(edge.source, edge.target);
        Modal.destroyAll();
      };

      return (
        <Form
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          labelWrap={true}
          layout="horizontal"
        >
          <Form.Item label="Source">
            <NodeSelectionComponent
              sm={sm}
              value={source}
              onSelect={setSource}
              onDeselect={() => setSource(undefined)}
            />
          </Form.Item>
          <Form.Item label="Target">
            <NodeSelectionComponent
              sm={sm}
              value={target}
              onSelect={setTarget}
              onDeselect={() => setTarget(undefined)}
            />
          </Form.Item>
          <Form.Item label="Predicate">
            <OntPropSearchComponent
              value={predicate}
              onSelect={setPredicate}
              onDeselect={(value) => setPredicate(undefined)}
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
              <Button type="primary" onClick={save} disabled={!isValid()}>
                Save
              </Button>
              {edge !== undefined ? (
                <Button
                  type="primary"
                  danger={true}
                  onClick={remove}
                  disabled={!isValid()}
                >
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
