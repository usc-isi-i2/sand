import { WithStyles, withStyles } from "@material-ui/styles";
import {
  Button,
  Form,
  Modal,
  Input,
  Radio,
  Space,
  Switch,
  Typography,
} from "antd";
import { observer } from "mobx-react";
import React, { useEffect, useMemo, useState } from "react";
import { useStores } from "../../../models";
import {
  ClassNode,
  DataNode,
  LiteralNode,
  SemanticModel,
  SMEdge,
  SMNode,
  SMNodeType,
  LiteralDataType,
} from "../../../models/sm";
import { NodeSearchComponent, SearchValue } from "../NodeSearchComponent";
import {
  EntitySearchComponent,
  OntClassSearchComponent,
  OntPropSearchComponent,
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
      classStore.fetchIfMissingByURI(props.node.uri);
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
      <>
        <Form.Item
          label={
            <Typography.Text
              copyable={
                uri !== undefined
                  ? {
                      text: classStore.getClassByURI(uri)?.id,
                    }
                  : undefined
              }
            >
              Class
            </Typography.Text>
          }
        >
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
        <Form.Item label="&nbsp;" colon={false}>
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
      </>
    );
  }
);

export const LiteralNodeSubForm = observer(
  (props: { sm: SemanticModel; node?: LiteralNode; onDone: () => void }) => {
    const { entityStore } = useStores();
    const [datatype, setDatatype] = useState<LiteralDataType>(
      props.node?.value?.type || "entity-id"
    );
    const [value, setValue] = useState<string | undefined>(
      props.node?.value?.type === "entity-id"
        ? props.node.value.id
        : props.node?.value !== undefined
        ? props.node.value.value.toString()
        : undefined
    );
    const [isInContext, setIsInContext] = useState(
      props.node !== undefined ? props.node.isInContext : false
    );

    const duplicatedValue = useMemo(
      () =>
        value !== undefined &&
        ((props.node === undefined &&
          props.sm.graph.literalNodeByValue(value) !== undefined) ||
          (props.node !== undefined &&
            props.sm.graph.literalNodeByValue(value)?.id !== props.node.id)),
      [props.sm.graph.version, value]
    );

    const onSave = () => {
      if (value === undefined) return;
      if (duplicatedValue) return;

      if (datatype === "entity-id") {
        const ent = entityStore.get(value)!;

        if (props.node === undefined) {
          // always create a new node
          props.sm.graph.addLiteralNode({
            id: props.sm.graph.nextNodeId(),
            value: {
              type: datatype,
              id: value,
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
              id: value,
              uri: ent.uri,
            },
            label: ent.readableLabel,
            nodetype: "literal_node",
            isInContext: isInContext,
          });
        }
      } else {
        let normValue = undefined;

        if (datatype === "boolean") {
          normValue = { type: datatype, value: value === "true" };
        } else if (datatype === "string") {
          normValue = { type: datatype, value };
        } else {
          normValue =
            datatype === "integer"
              ? { type: datatype, value: parseInt(value) }
              : { type: datatype, value: parseFloat(value) };
          if (Number.isNaN(normValue.value)) {
            return;
          }
        }

        if (props.node === undefined) {
          // always create a new node
          props.sm.graph.addLiteralNode({
            id: props.sm.graph.nextNodeId(),
            value: normValue!,
            label: value,
            nodetype: "literal_node",
            isInContext: isInContext,
          });
        } else {
          // we update existing node, it can be
          props.sm.graph.updateLiteralNode(props.node.id, {
            value: normValue,
            label: value,
            nodetype: "literal_node",
            isInContext: isInContext,
          });
        }
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
        (props.node.value.type === "entity-id" &&
          props.node.value.id !== value) ||
        (props.node.value.type !== "entity-id" &&
          props.node.value.value.toString() !== value)
      );
    };

    let valueInputForm = undefined;

    if (datatype === "entity-id") {
      valueInputForm = (
        <EntitySearchComponent
          value={value}
          onSelect={setValue}
          onDeselect={() => setValue(undefined)}
        />
      );
    } else if (
      datatype === "string" ||
      datatype === "integer" ||
      datatype === "decimal"
    ) {
      valueInputForm = (
        <Input
          value={value}
          type={datatype === "integer" ? "number" : "text"}
          onChange={(event) =>
            setValue(
              event.target.value.length > 0 ? event.target.value : undefined
            )
          }
        />
      );
    } else if (datatype === "boolean") {
      valueInputForm = (
        <Radio.Group
          value={value}
          onChange={(event) => setValue(event.target.value)}
        >
          <Radio value="true">True</Radio>
          <Radio value="false">False</Radio>
        </Radio.Group>
      );
    }

    return (
      <>
        <Form.Item
          label="Data Type"
          validateStatus={duplicatedValue ? "error" : undefined}
          help={duplicatedValue ? "Entity's already in the graph" : undefined}
        >
          <Radio.Group
            value={datatype}
            onChange={(event) => setDatatype(event.target.value)}
          >
            <Radio value="entity-id">Entity Id</Radio>
            <Radio value="string">String</Radio>
            <Radio value="integer">Integer</Radio>
            <Radio value="decimal">Decimal</Radio>
            <Radio value="boolean">Boolean</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          label={
            <Typography.Text
              copyable={value !== undefined ? { text: value } : undefined}
            >
              {datatype === "entity-id" ? "Entity" : "Value"}
            </Typography.Text>
          }
          validateStatus={duplicatedValue ? "error" : undefined}
          help={duplicatedValue ? "Entity's already in the graph" : undefined}
        >
          {valueInputForm}
        </Form.Item>
        <Form.Item label="Is In Context?">
          <Switch
            checked={isInContext}
            onChange={(val) => setIsInContext(val)}
          />
        </Form.Item>
        <Form.Item label="&nbsp;" colon={false}>
          <Space>
            <Button
              type="primary"
              onClick={onSave}
              disabled={value === undefined || duplicatedValue || !isModified()}
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
      </>
    );
  }
);

export const DataNodeSubForm = observer(
  ({
    sm,
    node,
    inedge,
    onDone,
  }: {
    sm: SemanticModel;
    node: DataNode;
    inedge?: SMEdge;
    onDone: () => void;
  }) => {
    const { classStore, propertyStore } = useStores();
    const [source, setSource] = useState<SearchValue | undefined>(
      inedge !== undefined
        ? {
            type: sm.graph.node(inedge.source).nodetype,
            id: inedge.source,
          }
        : undefined
    );
    const [uri, setURI] = useState<string | undefined>(inedge?.uri);
    const [approximation, setApproximation] = useState(false);

    const onSave = () => {
      if (source === undefined || uri === undefined) return;

      const prop = propertyStore.getPropertyByURI(uri)!;
      let sourceId;

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

      const newEdge = {
        source: sourceId,
        target: node.id,
        uri: prop.uri,
        approximation,
        label: prop.readableLabel,
      };
      if (inedge !== undefined) {
        if (inedge.source === sourceId) {
          sm.graph.updateEdge(inedge.source, inedge.target, newEdge);
        } else {
          sm.graph.removeEdge(inedge.source, inedge.target);
          sm.graph.addEdge(newEdge);
        }
      } else {
        sm.graph.addEdge(newEdge);
      }
      onDone();
    };

    const isModified = () => {
      return (
        source?.id !== inedge?.source ||
        uri !== inedge?.uri ||
        approximation !== inedge?.approximation
      );
    };

    const onDelete = () => {
      if (inedge === undefined) return;
      sm.graph.removeEdge(inedge.source, inedge.target);
      onDone();
    };

    return (
      <>
        <Form.Item
          label={
            <Typography.Text
              copyable={source !== undefined ? { text: source.id } : undefined}
            >
              Source
            </Typography.Text>
          }
        >
          <NodeSearchComponent
            sm={sm}
            value={source}
            onSelect={setSource}
            onDeselect={() => setSource(undefined)}
            classAndLiteralSearchOnly={true}
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
        <Form.Item label="Target">
          <Typography.Text>
            {node.label} ({node.columnIndex})
          </Typography.Text>
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
                source === undefined || uri === undefined || !isModified()
              }
            >
              Save
            </Button>
            {inedge !== undefined ? (
              <Button type="primary" danger={true} onClick={onDelete}>
                delete
              </Button>
            ) : null}
          </Space>
        </Form.Item>
      </>
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

      if (node !== undefined && node.nodetype === "data_node") {
        if (sm.graph.incomingEdges(node.id).length > 1) {
          return (
            <p>
              This form can't be used for data node that has more than one
              incoming edge. Please click on individual edge and edit it there
            </p>
          );
        }
      }

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
          ) : nodetype === "literal_node" ? (
            <LiteralNodeSubForm
              sm={sm}
              node={node?.nodetype === "literal_node" ? node : undefined}
              onDone={onDone}
            />
          ) : (
            <DataNodeSubForm
              sm={sm}
              node={node as DataNode}
              inedge={sm.graph.incomingEdges(node!.id)[0]}
              onDone={onDone}
            />
          )}
        </Form>
      );
    }
  )
);
