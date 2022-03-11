import { withStyles, WithStyles } from "@material-ui/styles";
import { observer } from "mobx-react";
import { useState } from "react";
import { useStores } from "../../../models";
import { Button, Form, Input, Modal, Space } from "antd";
import { Project, DraftUpdateProject } from "../../../models/project";
import { routes } from "../../../routes";

const styles = {};

export const UpdateProjectForm = withStyles(styles)(
  observer(
    ({
      project,
      classes,
    }: { project: Project } & WithStyles<typeof styles>) => {
      const { projectStore } = useStores();
      const [form] = Form.useForm();
      const [nameValidation, setNameValidation] = useState({
        name: "",
        status: "success",
      });

      const onSave = () => {
        const draft = DraftUpdateProject.fromProject(project);
        draft.name = form.getFieldValue("name");
        draft.description = form.getFieldValue("description");
        projectStore
          .update(draft)
          .then(() => {
            Modal.destroyAll();
          })
          .catch(() => {
            setNameValidation({ name: draft.name, status: "error" });
          });
      };

      const onDelete = () => {
        projectStore
          .delete(project.id)
          .then(() => {
            Modal.destroyAll();
          })
          .then(() => {
            routes.home.path().open();
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
              initialValue={project.name}
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
              initialValue={project.description}
            >
              <Input />
            </Form.Item>
            <Form.Item
              wrapperCol={{
                span: 20,
                offset: 4,
              }}
            >
              <Space style={{ width: "100%" }}>
                <Button type="primary" htmlType="submit">
                  Update
                </Button>
                <Button type="primary" danger={true} onClick={onDelete}>
                  Delete
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </>
      );
    }
  )
);

export const openUpdateProjectForm = (project: Project, zIndex?: number) => {
  const content = <UpdateProjectForm project={project} />;

  Modal.info({
    title: (
      <span style={{ marginBottom: 16, display: "inline-block" }}>
        Update Project {project.name}
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
