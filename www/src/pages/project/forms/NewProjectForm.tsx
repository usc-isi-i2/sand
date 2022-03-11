import { withStyles, WithStyles } from "@material-ui/styles";
import { observer } from "mobx-react";
import { useState } from "react";
import { useStores } from "../../../models";
import { Button, Form, Input, Modal } from "antd";
import { DraftCreateProject } from "../../../models/project";

const styles = {};

export const NewProjectForm = withStyles(styles)(
  observer(({ classes }: WithStyles<typeof styles>) => {
    const { projectStore } = useStores();
    const [form] = Form.useForm();
    const [nameValidation, setNameValidation] = useState({
      name: "",
      status: "success",
    });

    const onSave = () => {
      const project = new DraftCreateProject("");
      project.name = form.getFieldValue("name");
      project.description = form.getFieldValue("description");

      projectStore
        .create(project)
        .then(() => {
          Modal.destroyAll();
        })
        .catch(() => {
          setNameValidation({ name: project.name, status: "error" });
        });
    };

    return (
      <>
        <Form
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 20 }}
          form={form}
          onFinish={onSave}
        >
          <Form.Item
            name="name"
            label="name"
            rules={[
              {
                required: true,
              },
            ]}
            validateStatus={
              nameValidation.name === form.getFieldValue("name") &&
              nameValidation.status === "error"
                ? "error"
                : undefined
            }
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="description"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            wrapperCol={{
              span: 20,
              offset: 4,
            }}
          >
            <Button type="primary" htmlType="submit">
              Create
            </Button>
          </Form.Item>
        </Form>
      </>
    );
  })
);

export const openNewProjectForm = (zIndex?: number) => {
  const content = <NewProjectForm />;

  Modal.info({
    title: (
      <span style={{ marginBottom: 16, display: "inline-block" }}>
        New Project
      </span>
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
};
