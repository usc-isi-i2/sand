import { Modal } from "antd";
import { EdgeForm, EdgeFormProps } from "./EdgeForm";
import { NodeForm, NodeFormProps } from "./NodeForm";
import {
  TransformationForm,
  TransformationFormProps,
} from "./TransformationForm";
import { Table } from "../../../models";

interface TypedEdgeFormProps extends EdgeFormProps {
  type: "edge";
}

interface TypedNodeFormProps extends NodeFormProps {
  type: "node";
}

interface TypedTransformationFormProps extends TransformationFormProps {
  id?: number;
  table: Table;
}

export function openForm(
  args: TypedEdgeFormProps | TypedNodeFormProps | TypedTransformationFormProps,
  zIndex?: number
) {
  let title;
  let content;
  switch (args.type) {
    case "edge":
      content = <EdgeForm {...args} />;
      title = args.edge === undefined ? "Add Edge" : "Update Edge";
      break;
    case "node":
      content = <NodeForm {...args} />;
      title = args.node === undefined ? "Add Node" : "Update Node";
      break;
    case "transformation":
      content = <TransformationForm {...args} />;
      title =
        args.id === undefined ? "Add Transformation" : "Update Transformation";
      break;
  }

  Modal.info({
    title: (
      <span style={{ marginBottom: 16, display: "inline-block" }}>{title}</span>
    ),
    content,
    bodyStyle: { margin: -8 },
    okButtonProps: { style: { display: "none" } },
    maskClosable: true,
    mask: true,
    zIndex: zIndex,
    width: "calc(100% - 128px)",
    style: { top: 64 },
  });
}
