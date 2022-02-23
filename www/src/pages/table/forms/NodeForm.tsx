import { WithStyles, withStyles } from "@material-ui/styles";
import { Button, Form, Modal, Radio, Space, Switch } from "antd";
import { observer } from "mobx-react";
import React, { useEffect, useMemo, useState } from "react";
import { useStores } from "../../../models";
import {
  ClassNode,
  LiteralNode,
  SemanticModel,
  SMNode,
  SMNodeType,
} from "../../../models/sm";
import {
  EntitySearchComponent,
  OntClassSearchComponent,
} from "../OntSearchComponent";

const styles = {} as const;

export interface NodeFormProps {
  sm: SemanticModel;
  node?: SMNode;
}

/**
 * Form for adding/editing a node in the graph. There are two cases:
 *
 * 1. Create new node -- when node is undefined
 * 2. Delete or update existing node data without modifying its edges -- when the node is provided
 */
export const ClassNodeSubForm = observer(
  (props: { sm: SemanticModel; node?: ClassNode; onDone: () => void }) => {
    const { classStore } = useStores();
    const [uri, setURI] = useState<string | undefined>(props.node?.uri);
    const [approximation, setApproximation] = useState(
      props.node?.approximation || false
    );

    // fetch class id associated with the node uri
    useEffect(() => {
      if (props.node === undefined) return;
      if (classStore.getClassByURI(props.node.uri) !== undefined) return;

      classStore.fetchOne({ conditions: { uri: props.node.uri } });
    }, [props.node?.uri]);

    const onSave = () => {
      if (uri === undefined) return;

      if (props.node === undefined) {
        // always create a new node
        props.sm.graph.addClassNode({
          id: props.sm.graph.nextNodeId(),
          uri: uri,
          label: classStore.getClassByURI(uri)!.readableLabel,
          nodetype: "class_node",
          approximation: approximation,
        });
      } else {
        // we update existing node, it can be
        props.sm.graph.updateClassNode(props.node.id, {
          uri: uri,
          label: classStore.getClassByURI(uri)!.readableLabel,
          approximation: approximation,
        });
      }

      props.onDone();
    };

    const onDelete = () => {
      props.sm.graph.removeNode(props.node!.id);
      props.onDone();
    };

    const isModified = () => {
      return (
        props.node === undefined ||
        props.node.uri !== uri ||
        props.node.approximation !== approximation
      );
    };

    return (
      <React.Fragment>
        <Form.Item label="Class">
          <OntClassSearchComponent
            value={
              uri !== undefined ? classStore.getClassByURI(uri)?.id : undefined
            }
            onSelect={(id) => setURI(classStore.get(id)?.uri)}
            onDeselect={() => setURI(undefined)}
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
              disabled={uri === undefined || !isModified()}
            >
              Save
            </Button>
            {props.node !== undefined ? (
              <Button type="primary" danger={true} onClick={onDelete}>
                delete
              </Button>
            ) : null}
          </Space>
        </Form.Item>
      </React.Fragment>
    );
  }
);

export const LiteralNodeSubForm = observer(
  (props: { sm: SemanticModel; node?: LiteralNode; onDone: () => void }) => {
    const { entityStore } = useStores();
    const [id, setId] = useState<string | undefined>(
      props.node?.value?.type === "entity-id" ? props.node.value.id : undefined
    );
    const [isInContext, setIsInContext] = useState(
      props.node !== undefined && props.node.nodetype === "literal_node"
        ? props.node.isInContext
        : false
    );

    const duplicatedId = useMemo(
      () =>
        id !== undefined &&
        ((props.node === undefined &&
          props.sm.graph.nodeByEntityId(id) !== undefined) ||
          (props.node !== undefined &&
            props.sm.graph.nodeByEntityId(id)?.id !== props.node.id)),
      [props.sm.graph.version, id]
    );

    if (props.node !== undefined && props.node.value.type === "string") {
      return <div>Not Implemented Yet</div>;
    }

    const onSave = () => {
      if (id === undefined) return;
      if (duplicatedId) return;

      const ent = entityStore.get(id)!;

      if (props.node === undefined) {
        // always create a new node
        props.sm.graph.addLiteralNode({
          id: props.sm.graph.nextNodeId(),
          value: {
            type: "entity-id",
            id: id,
            uri: ent.uri,
          },
          label: ent.readableLabel,
          nodetype: "literal_node",
          isInContext: isInContext,
        });
      } else {
        // we update existing node, it can be
        props.sm.graph.updateLiteralNode(props.node.id, {
          value: {
            type: "entity-id",
            id: id,
            uri: ent.uri,
          },
          label: ent.readableLabel,
          nodetype: "literal_node",
          isInContext: isInContext,
        });
      }

      props.onDone();
    };

    const onDelete = () => {
      props.sm.graph.removeNode(props.node!.id);
      props.onDone();
    };

    const isModified = () => {
      return (
        props.node === undefined ||
        props.node.isInContext !== isInContext ||
        (props.node.value.type === "entity-id" && props.node.value.id !== id)
      );
    };

    return (
      <React.Fragment>
        <Form.Item
          label="Entity"
          validateStatus={duplicatedId ? "error" : undefined}
          help={duplicatedId ? "Entity's already in the graph" : undefined}
        >
          <EntitySearchComponent
            value={id}
            onSelect={setId}
            onDeselect={() => setId(undefined)}
          />
        </Form.Item>
        <Form.Item label="Is In Context?">
          <Switch
            checked={isInContext}
            onChange={(val) => setIsInContext(val)}
          />
        </Form.Item>
        <Form.Item label="Button">
          <Space>
            <Button
              type="primary"
              onClick={onSave}
              disabled={id === undefined || duplicatedId || !isModified()}
            >
              Save
            </Button>
            {props.node !== undefined ? (
              <Button type="primary" danger={true} onClick={onDelete}>
                delete
              </Button>
            ) : null}
          </Space>
        </Form.Item>
      </React.Fragment>
    );
  }
);

export const NodeForm = withStyles(styles)(
  observer(
    ({ sm, node, classes }: NodeFormProps & WithStyles<typeof styles>) => {
      const [nodetype, setNodeType] = useState<SMNodeType>(
        node?.nodetype || "class_node"
      );
      const onDone = () => Modal.destroyAll();

      return (
        <Form
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          labelWrap={true}
          layout="horizontal"
        >
          {node === undefined ? (
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
          ) : null}
          {nodetype === "class_node" ? (
            <ClassNodeSubForm
              sm={sm}
              node={node?.nodetype === "class_node" ? node : undefined}
              onDone={onDone}
            />
          ) : (
            <LiteralNodeSubForm
              sm={sm}
              node={node?.nodetype === "literal_node" ? node : undefined}
              onDone={onDone}
            />
          )}
        </Form>
      );
    }
  )
);
