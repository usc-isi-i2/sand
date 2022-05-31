import { Button, Form, FormInstance, Input, Select, Switch } from "antd";
import React from "react";
import { CSVParserOpts, formats, ParserOpts } from "../../../../models/project";

export const CSVParserForm = ({
  opt,
  form,
}: {
  form: FormInstance<any>;
  opt: CSVParserOpts;
}) => {
  return (
    <>
      <Form.Item
        name="delimiter"
        label="delimiter"
        rules={[{ required: true }]}
      >
        <Input
          onChange={(e) => {
            form.setFieldsValue({
              delimiter: e.target.value
                .replace("\\t", "\t")
                .replace("\\n", "\n"),
            });
          }}
          style={{ width: 60 }}
        />
      </Form.Item>
      <Form.Item
        name="first_row_is_header"
        label="Is first row header"
        rules={[{ required: true }]}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
    </>
  );
};

export const escapeDelimiter = (delimiter?: string) => {
  switch (delimiter) {
    case "\t":
      return "\\t";
    case "\n":
      return "\\n";
    default:
      return delimiter;
  }
};

export const ParserOptsForm = (props: {
  parserOpts: ParserOpts;
  setParserOpts: (opts: ParserOpts) => void;
}) => {
  const [form] = Form.useForm();
  let additionalProps;

  if (props.parserOpts.format === "csv") {
    additionalProps = <CSVParserForm opt={props.parserOpts} form={form} />;
  } else {
    additionalProps = null;
  }

  const updateOpts = () => {
    props.setParserOpts(form.getFieldsValue());
  };

  return (
    <Form
      layout="inline"
      form={form}
      initialValues={{
        ...props.parserOpts,
        delimiter:
          props.parserOpts.format === "csv"
            ? escapeDelimiter(props.parserOpts.delimiter)
            : undefined,
      }}
      onFinish={updateOpts}
    >
      <Form.Item name="format" label="File Type" rules={[{ required: true }]}>
        <Select
          onChange={(value) => {
            form.setFieldsValue({ format: value });
          }}
        >
          {formats.map((value) => (
            <Select.Option key={value} value={value}>
              {value}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      {additionalProps}
      <Form.Item>
        <Button type="primary" htmlType="submit">
          Update
        </Button>
      </Form.Item>
    </Form>
  );
};
