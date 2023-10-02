import { WithStyles, withStyles } from "@material-ui/styles";
import { Button, Radio, Typography, Menu, Switch, Space, Tag, Modal, Form, Input, Col, Divider, Row, Select, InputNumber} from "antd";
import { observer } from "mobx-react";
import ProTable, { ActionType } from "@ant-design/pro-table";
import { LoadingComponent, NotFoundComponent } from "gena-app";
import { routes } from "../../../routes";
import React, { useEffect,useRef, useMemo, useState } from "react";
import Editor, { DiffEditor, useMonaco, loader } from '@monaco-editor/react';
import {TransformTable, useStores } from "../../../models";

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

export interface TransformFormProps {
  }


export const TransformForm = withStyles(styles)(
    observer(({classes}: TransformFormProps & WithStyles<typeof styles>) => {
     
        const onDone = () => Modal.destroyAll();
        const { Option } = Select;
        const { TextArea } = Input;
        const actionRef = useRef<ActionType>();
        const tableId = 1 //routes.table.useURLParams()!.tableId;
        const {tableStore, projectStore,tableRowStore } = useStores();
        const [form] = Form.useForm();

        const [datapath, setDatapath]  = useState(""); 

        const options = {
          autoIndent: 'full',
          contextmenu: true,
          fontFamily: 'monospace',
          fontSize: 13,
          lineHeight: 24,
          // hideCursorInOverviewRuler: true,
          matchBrackets: 'always',
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
          cursorStyle: 'line',
          automaticLayout: true,
        }; 

        const [editorData, setEditorData] = useState<string|undefined>();

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
            { dataIndex: "transformed_value", title: "Transformed Value" },
        ];

        const handleClicks = async () => {
          console.log(table.columns);
          console.log(form.getFieldValue("datapath"));
          console.log(editorData);
          var idx = table.columns.indexOf(form.getFieldValue("datapath")[0]);
          console.log(tableId);
          const allrows = await tableRowStore.fetchByTable(
            table,
            0,
            table.size
          );
          const columnValues  = allrows.map(element => {
            if(idx<0){
              idx = 1;
            }
            return (element.row[idx]);
          });
          console.log(columnValues);
        }

        function handleEditorChange(value :string | undefined) {
            setEditorData(value);
        }

        return (
            <Form
            form={form}
            
            >
          <Row gutter={16} justify="start">
            <Col span={4} >
             <Form.Item>
                  <Select
                placeholder="Transformation Type"
                allowClear
              >
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
                        width: '100%',
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
                    width: '100%',
                }}
                placeholder="Please select"
                defaultValue={['Name']}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row  justify="center" align="top">
          <Col span={24}>
          <Form.Item
            label="Language : Restricted Python"
            labelCol={{ span: 24 }}
            >
            {/* <TextArea rows={4} placeholder="Type transform code here"/> */}
            <Editor height="25vh" defaultLanguage="python" defaultValue="def transform(value): pass"
            onChange={handleEditorChange} options={options}/>
          </Form.Item>
          </Col>
          </Row>
          <Row gutter={[8,8]} justify="space-between" >
          <Col span={2} flex="auto">
                <Form.Item>
                <Button style={{width:"100%"}} type="primary" onClick={handleClicks}> Execute </Button>
                </Form.Item>
            </Col>
            <Col span={2} flex="auto">
                <Form.Item>
                <Button style={{width:"100%"}} type="primary"> Save </Button>
                </Form.Item>
            </Col>
            <Col span={2} flex="auto">
                <Form.Item>
                <Button style={{width:"100%"}} type="primary"> Reset </Button>
                </Form.Item>
            </Col>
            <Col span={11} style={{paddingLeft: "2rem"}}>
            <Form.Item
              name="onerror"
              label="on error"
              rules={[{ required: true }]}
              >
              <Radio.Group >
                    <Radio value={1}>Set To Blank</Radio>
                    <Radio value={2}>Store Error</Radio>
                    <Radio value={3}>Keep Original</Radio>
                    <Radio value={4}>Abort</Radio>
             </Radio.Group>
            </Form.Item>
            </Col>
            <Space></Space>
            <Col span={4} >
              <Form.Item
              name="tolerance"
              label="tolerance"
              rules={[{ required: true}]}
              >
                <InputNumber placeholder="3" defaultValue={3}/>
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item
              name="rows"
              label="rows"
              >
                <InputNumber />
              </Form.Item>
            
            </Col>
          </Row>
          <Row>
            <Col span={24}>
            <ProTable<ReturnType<typeof table2row>>
        //   actionRef={actionRef}
          className={classes.table}
          defaultSize="small"
          bordered={true}
          request={async (params, sort, filter) => {
            var tab : TransformTable = {id: 1, row_id: 1, previous_value: "lower", transformed_value: "upper"};
            return  await {
              data: [tab].map(table2row),
              success: true,
              total:1,
            };
          }}
          search={false}
          headerTitle={<Typography.Title level={4}>Results</Typography.Title>}
          columns={columns}
          pagination={false}
            />
            </Col>
          </Row>
          </Form>
        );

    }));
    function table2row(tbl: TransformTable) {
        return {
            row_id: tbl.row_id,
            previous_value: tbl.previous_value,
            transformed_value: tbl.transformed_value
        };
      }
      

