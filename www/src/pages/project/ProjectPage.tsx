import { EditOutlined } from "@ant-design/icons";
import ProTable, { ActionType } from "@ant-design/pro-table";
import { withStyles, WithStyles } from "@material-ui/styles";
import { Button, Modal, Popconfirm, Typography } from "antd";
import { InternalLink, LoadingComponent, NotFoundComponent } from "gena-app";
import _ from "lodash";
import { observer } from "mobx-react";
import React, { useEffect, useRef } from "react";
import { Table, useStores } from "../../models";
import { routes } from "../../routes";
import { openUpdateProjectForm } from "./forms/UpdateProjectForm";
import { openUploadTableForm } from "./forms/upload";

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

export const ProjectPage = withStyles(styles)(
  observer(({ classes }: WithStyles<typeof styles>) => {
    const projectId = routes.project.useURLParams()!.projectId;
    const [modal, contextHolder] = Modal.useModal();
    const actionRef = useRef<ActionType>();

    const { projectStore, tableStore } = useStores();
    useEffect(() => {
      projectStore.fetchById(projectId);
    }, [projectStore, projectId]);

    const project = projectStore.get(projectId);
    if (project === undefined) {
      return <LoadingComponent />;
    } else if (project === null) {
      return <NotFoundComponent />;
    }

    const columns = [
      { dataIndex: "id", title: "id" },
      {
        dataIndex: "name",
        title: "name",
        renderText: (text: string, tbl: ReturnType<typeof table2row>) => {
          return (
            <InternalLink
              path={routes.table}
              urlArgs={{ tableId: tbl.id }}
              queryArgs={{
                query: tableStore.encodeWhereQuery({ project: projectId }),
              }}
            >
              {tbl.name}
            </InternalLink>
          );
        },
      },
      { dataIndex: "description", title: "description" },
      {
        dataIndex: "id",
        title: "action",
        renderText: (_: string, tbl: ReturnType<typeof table2row>) => {
          return (
            <Popconfirm
              title="Are you sure to delete this table?"
              onConfirm={() => {
                tableStore.delete(tbl.id);
                actionRef.current?.reload();
              }}
              okText="Yes"
              cancelText="No"
            >
              <Button type="primary" danger={true} size="small">
                Delete
              </Button>
            </Popconfirm>
          );
        },
      },
    ];

    return (
      <React.Fragment>
        <Typography.Title level={3}>
          Project {_.upperFirst(project.name)}
          &nbsp;
          <a
            style={{ fontSize: "0.8em", fontWeight: 400 }}
            onClick={() => openUpdateProjectForm(project)}
          >
            <EditOutlined />
          </a>
        </Typography.Title>
        <Typography.Text>
          <b>Description:</b>{" "}
          <Typography.Text type="secondary">
            {project.description}
          </Typography.Text>
        </Typography.Text>
        <ProTable<ReturnType<typeof table2row>>
          actionRef={actionRef}
          className={classes.table}
          defaultSize="small"
          bordered={true}
          request={async (params, sort, filter) => {
            let result = await tableStore.fetch({
              limit: params.pageSize!,
              offset: (params.current! - 1) * params.pageSize!,
              conditions: { project: projectId },
            });
            return {
              data: result.records.map(table2row),
              success: true,
              total: result.total,
            };
          }}
          options={{
            search: true,
          }}
          headerTitle={<Typography.Title level={4}>Tables</Typography.Title>}
          toolBarRender={() => {
            return [
              <Button
                key="upload"
                type="primary"
                onClick={() =>
                  openUploadTableForm(project, {
                    modal,
                    onDone: () => {
                      actionRef.current?.reload();
                    },
                  })
                }
              >
                Upload
              </Button>,
            ];
          }}
          search={false}
          pagination={{
            pageSize: 500,
            pageSizeOptions: ["10", "20", "50", "100", "200", "500", "1000"],
          }}
          rowKey="id"
          columns={columns}
        />
        {contextHolder}
      </React.Fragment>
    );
  })
);

function table2row(tbl: Table) {
  return {
    id: tbl.id,
    name: tbl.name,
    description: tbl.description,
  };
}
