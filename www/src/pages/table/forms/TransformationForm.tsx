import { WithStyles, withStyles } from "@material-ui/styles";
import {Button,Radio,Typography,Menu,Tag,Space,Table,Modal,Form,Input,Col,Row,Select,InputNumber,
} from "antd";
import { observer } from "mobx-react";
import ProTable, { ActionType } from "@ant-design/pro-table";
import { LoadingComponent, NotFoundComponent } from "gena-app";
import React, { useEffect, useRef, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { TransformTable, useStores } from "../../../models";
import { SERVER } from "../../../env";
import axios from "axios";
import { Padding } from "@mui/icons-material";


const styles = {
  table: {
    "& div.ant-table-container": {
      border: "1px solid #bbb",
      borderRadius: 4,
      borderLeft: "1px solid #bbb !important",
    },
    "& div.ant-card-body": {
      paddingLeft: 0,
      paddingRight: 0,
    },
    "& th": {
      fontWeight: 600,
    },
  },
};

export interface TransformFormProps {}

export class TPayload {
  public type!: string;
  public mode!: string;
  public datapath!: string[];
  public code!: string | undefined;
  public outputpath!: string[] | undefined;
  public tolerance!: number;
  public rows!: number;
}

export const TransformForm = withStyles(styles)(
  observer(({ classes }: TransformFormProps & WithStyles<typeof styles>) => {
    const onDone = () => Modal.destroyAll();
    const { Option } = Select;
    const { TextArea } = Input;
    const actionRef = useRef<ActionType>();
    const tableId = 1; //routes.table.useURLParams()!.tableId;
    const { tableStore, projectStore, tableRowStore } = useStores();
    const [form] = Form.useForm();

    const [datapath, setDatapath] = useState("");

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

    type ErrorResponse = {
      message: string;
      error: string;
    };

    const [result, setResult] = useState<TransformTable[] | undefined>();
    const [editorData, setEditorData] = useState<string | undefined>();

    useEffect(() => {
      // fetch the table
      tableStore.fetchById(tableId).then((table) => {
        if (table !== undefined) {
          projectStore.fetchById(table.project);
        }
      });
    }, [tableStore, projectStore, tableId]);

    const table = tableStore.get(tableId);

    if (table === null) {
      return <NotFoundComponent />;
    } else if (table === undefined) {
      // the table and sms is loading
      return <LoadingComponent />;
    }

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

    const filterErrorMessage = (errorMessage: string) => {
      return errorMessage.split(':').splice(1).join(':').trim();
    }

    const postData = async (payload: TPayload) => {
      let resp: any = await axios
        .post(`${SERVER}/api/transform/1/transformations`, payload)
        .then((res) => res.data)
        .catch((error) => filterErrorMessage(error.response.data.message));
      return resp;
    };

    const onExecute = async () => {
      const transformPayload = new TPayload();
      transformPayload.type = form.getFieldValue("type");
      transformPayload.code = editorData;
      transformPayload.mode = "restrictedpython";
      transformPayload.datapath = form.getFieldValue("datapath");
      transformPayload.outputpath = form.getFieldValue("outputpath");
      transformPayload.tolerance = form.getFieldValue("tolerance");
      transformPayload.rows = form.getFieldValue("rows");

      let res = await postData(transformPayload);
      setResult(res);
    };

    function handleEditorChange(value: string | undefined) {
      setEditorData(value);
    }

    return (
      <Form form={form}>
        <Row gutter={16} justify="start">
          <Col span={4}>
            <Form.Item name="type" label="type" rules={[{ required: true }]}>
              <Select placeholder="Transformation Type" allowClear>
                <Option value="map">Map</Option>
                <Option value="filter">Filter</Option>
                <Option value="split">Split</Option>
                <Option value="concatenate">Concatenate</Option>
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
                allowClear
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
                allowClear
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
              label="Language : Restricted Python"
              labelCol={{ span: 24 }}
              style={{ fontWeight: "500", padding: "0px" }}
            >
              <div style={{ border: "1px solid #ccc" }}>
                <Editor
                  height="25vh"
                  defaultLanguage="python"
                  onChange={handleEditorChange}
                  options={options}
                />
              </div>
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
              initialValue={2}
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
            ) : result ? (
              <Tag style={{padding: "0px"}} color={"volcano"}>
                <pre style={{margin: "5px"}}>{result}</pre>
              </Tag>
            ) : (
              <></>
            )}
          </Col>
        </Row>
      </Form>
    );
  })
);
function table2row(tbl: TransformTable) {
  return {
    key: tbl.path,
    row_id: tbl.path + 1,
    previous_value: tbl.value,
    result: tbl.ok !== undefined ? tbl.ok.toString() : tbl.error.trim(),
  };
}
