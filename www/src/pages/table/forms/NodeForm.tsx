import { WithStyles, withStyles } from "@material-ui/styles";
import { Button, Form, Modal, Radio, Space, Switch } from "antd";
import { observer } from "mobx-react";
import { useState } from "react";
import { useStores } from "../../../models";
import { SMNode, SemanticModel, SMNodeType } from "../../../models/sm";
import { OntClassSearchComponent } from "../OntSearchComponent";

const styles = {} as const;

export interface NodeFormProps {
  sm: SemanticModel;
  node?: SMNode;
}

export const NodeForm = withStyles(styles)(
  observer(
    ({ sm, node, classes }: NodeFormProps & WithStyles<typeof styles>) => {
      const { classStore } = useStores();
      const [nodetype, setNodeType] = useState<SMNodeType>("class_node");
      const [nodeId, setNodeId] = useState<string | undefined>(node?.id);
      const [approximation, setApproximation] = useState(
        node !== undefined && node.nodetype === "class_node"
          ? node.approximation
          : false
      );
      const [isInContext, setIsInContext] = useState(
        node !== undefined && node.nodetype === "literal_node"
          ? node.isInContext
          : false
      );

      const isValid = () => nodeId !== undefined;
      const isDeletable = () => {
        if (node === undefined) return false;
        if (node.nodetype === "literal_node" && node.isInContext) return false;
        return true;
      };

      const save = () => {
        if (!isValid()) return;
        const node = classStore.get(nodeId!)!;

        switch (nodetype) {
          case "class_node":
            sm.graph.addClassNode({
              id: sm.graph.nextNodeId(),
              uri: node.uri,
              approximation,
              label: node.readableLabel,
              nodetype,
            });
            break;
          case "literal_node":
            sm.graph.addLiteralNode({
              id: `ent:${node.id}`,
              value: {
                type: "entity-id",
                id: node.id,
                uri: node.uri,
              },
              label: node.readableLabel,
              isInContext: isInContext,
              nodetype,
            });
            break;
        }

        Modal.destroyAll();
      };

      const remove = () => {
        if (node === undefined) return;
        sm.graph.removeNode(node.id);
        Modal.destroyAll();
      };

      return (
        <Form
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          labelWrap={true}
          layout="horizontal"
        >
          <Form.Item label="Node Type">
            <Radio.Group
              value={nodetype}
              onChange={(event) => setNodeType(event.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="class_node">Class Node</Radio.Button>
              <Radio.Button value="literal_node">Literal Node</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="ID or URI">
            <OntClassSearchComponent
              value={nodeId}
              onSelect={setNodeId}
              onDeselect={(value) => setNodeId(undefined)}
            />
          </Form.Item>
          {nodetype === "class_node" ? (
            <Form.Item label="Approximation">
              <Switch
                checked={approximation}
                onChange={(val) => setApproximation(val)}
              />
            </Form.Item>
          ) : null}
          {nodetype === "literal_node" ? (
            <Form.Item label="Is In Context?">
              <Switch
                checked={isInContext}
                onChange={(val) => setIsInContext(val)}
              />
            </Form.Item>
          ) : null}
          <Form.Item label="Button">
            <Space>
              <Button type="primary" onClick={save} disabled={!isValid()}>
                Save
              </Button>
              {node !== undefined ? (
                <Button
                  type="primary"
                  danger={true}
                  onClick={remove}
                  disabled={!isDeletable()}
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
