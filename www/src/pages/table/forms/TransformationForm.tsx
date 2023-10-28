import { WithStyles, withStyles } from "@material-ui/styles";
import {
  Button,
  Radio,
  Tag,
  Space,
  Table,
  Modal,
  Form,
  Col,
  Row,
  Select,
  InputNumber,
} from "antd";
import { observer } from "mobx-react";
import { ActionType } from "@ant-design/pro-table";
import { useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { TransformationTable, useStores } from "../../../models";
import {
  Transformation
} from "../../../models/transformation/TransformationStore";

const styles = {
};

export interface TransformationFormProps {
  type: string;
  tableId: number;
}

export const TransformationForm = withStyles(styles)(
  observer(
    ({
      classes,
      tableId,
    }: TransformationFormProps & WithStyles<typeof styles>) => {
      const onDone = () => Modal.destroyAll();
      const actionRef = useRef<ActionType>();
      const [form] = Form.useForm();
      const { transformationStore } = useStores();
      const [result, setResult] = useState<TransformationTable[] | undefined>();

      const columns = [
        { dataIndex: "row_id", title: "Row ID" },
        { dataIndex: "previous_value", title: "Previous Value" },
        {
          dataIndex: "result",
          title: "Result",
          render: (transformed_value: string | boolean) => {
            if (
              typeof transformed_value === "string" &&
              transformed_value.includes("Traceback")
            ) {
              return (
                <>
                  {" "}
                  {
                    <Tag color={"volcano"}>
                      <pre>{transformed_value}</pre>
                    </Tag>
                  }
                </>
              );
            } else {
              return transformed_value;
            }
          },
        },
      ];

      const onExecute = async () => {
        const transformPayload = new Transformation();
        transformPayload.type = form.getFieldValue("type");
        transformPayload.code = form.getFieldValue("code");
        transformPayload.mode = "restrictedpython";
        transformPayload.datapath = form.getFieldValue("datapath");
        transformPayload.outputpath = form.getFieldValue("outputpath");
        transformPayload.tolerance = form.getFieldValue("tolerance");
        transformPayload.rows = form.getFieldValue("rows");

        let response = await transformationStore.testTransformation(tableId, transformPayload);
        setResult(response);
      };

      return (
        <Form form={form}>
          <Row gutter={16} justify="start">
            <Col span={4}>
              <Form.Item name="type" label="type" rules={[{ required: true }]}>
                <Select placeholder="Transformation Type" allowClear={true}>
                  <Select.Option value="map">Map</Select.Option>
                  <Select.Option value="filter">Filter</Select.Option>
                  <Select.Option value="split">Split</Select.Option>
                  <Select.Option value="concatenate">Concatenate</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="datapath"
                label="datapath"
                rules={[{ required: true }]}
              >
                <Select
                  mode="tags"
                  allowClear={true}
                  style={{
                    width: "100%",
                  }}
                  placeholder="Please select"
                />
              </Form.Item>
            </Col>
            <Space></Space>
            <Col span={10}>
              <Form.Item
                name="outputpath"
                label="outputpath"
                rules={[{ required: true }]}
              >
                <Select
                  mode="tags"
                  allowClear={true}
                  style={{
                    width: "100%",
                  }}
                  placeholder="Please select"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row justify="center" align="top">
            <Col span={24}>
              <Form.Item
                name = "code"
                label="Language : Restricted Python"
                labelCol={{ span: 24 }}
                style={{ fontWeight: 500, padding: 0 }}
              >
                <CustomEditor />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[8, 8]} justify="space-between">
            <Col span={2} flex="auto">
              <Form.Item>
                <Button
                  style={{ width: "100%" }}
                  type="primary"
                  onClick={onExecute}
                >
                  {" "}
                  Execute{" "}
                </Button>
              </Form.Item>
            </Col>
            <Col span={2} flex="auto">
              <Form.Item>
                <Button style={{ width: "100%" }} type="primary">
                  {" "}
                  Save{" "}
                </Button>
              </Form.Item>
            </Col>
            <Col span={2} flex="auto">
              <Form.Item>
                <Button style={{ width: "100%" }} type="primary">
                  {" "}
                  Reset{" "}
                </Button>
              </Form.Item>
            </Col>
            <Col span={11} style={{ paddingLeft: "2rem" }}>
              <Form.Item
                name="onerror"
                label="on error"
                rules={[{ required: true }]}
                initialValue={4}
              >
                <Radio.Group>
                  <Radio value={1}>Set To Blank</Radio>
                  <Radio value={2}>Store Error</Radio>
                  <Radio value={3}>Keep Original</Radio>
                  <Radio value={4}>Abort</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Space></Space>
            <Col span={4}>
              <Form.Item
                name="tolerance"
                label="tolerance"
                rules={[{ required: true }]}
                initialValue={3}
              >
                <InputNumber placeholder="3" />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="rows" label="rows">
                <InputNumber />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              {Array.isArray(result) ? (
                <Table
                  style={{ border: "1px solid #ccc" }}
                  columns={columns}
                  dataSource={result.map(table2row)}
                  pagination={{ pageSize: 4 }}
                />
              ) : result != undefined ? (
                <Tag style={{ padding: 0 }} color={"volcano"}>
                  <pre style={{ margin: "5px" }}>{result}</pre>
                </Tag>
              ) : (
                <></>
              )}
            </Col>
          </Row>
        </Form>
      );
    }
  )
);

export const CustomEditor = ({
  value,
  onChange
}: {
  value?: string;
  onChange?: (value: string | undefined) => void;
}) => {

  const options = {
    autoIndent: "full",
    contextmenu: true,
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 24,
    matchBrackets: "always",
    minimap: {
      enabled: false,
    },
    scrollbar: {
      horizontalSliderSize: 4,
      verticalSliderSize: 18,
    },
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: "line",
    automaticLayout: true,
  };

  return (
    <div style={{ border: "1px solid #ccc" }}>
    <Editor
      height="25vh"
      defaultLanguage="python"
      onChange={onChange}
      options={options}
      value={value}
    />
    </div>
  );
}
function table2row(tbl: TransformationTable) {
  return {
    key: tbl.path,
    row_id: tbl.path + 1,
    previous_value: tbl.value,
    result: tbl.ok !== undefined ? tbl.ok.toString() : tbl.error.trim(),
  };
}
