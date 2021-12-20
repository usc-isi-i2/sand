import ProTable from "@ant-design/pro-table";
import { withStyles, WithStyles } from "@material-ui/styles";
import { Typography } from "antd";
import _ from "lodash";
import { observer } from "mobx-react";
import React, { useEffect } from "react";
import { InternalLink, LoadingPage, NotFoundPage } from "rma-baseapp";
import { Table, useStores } from "../models";
import { routes } from "../routes";

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

    const { projectStore, tableStore } = useStores();
    useEffect(() => {
      projectStore.fetchById(projectId);
    }, [projectStore, projectId]);

    const project = projectStore.get(projectId);
    if (project === undefined) {
      return <LoadingPage />;
    } else if (project === null) {
      return <NotFoundPage />;
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
    ];

    return (
      <React.Fragment>
        <Typography.Title level={3}>
          Project: {_.upperFirst(project.name)}
        </Typography.Title>
        <ProTable<ReturnType<typeof table2row>>
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
          // toolBarRender={false}
          search={false}
          pagination={{
            pageSize: 10,
            pageSizeOptions: ["10", "20", "50", "100", "200", "500", "1000"],
          }}
          rowKey="id"
          columns={columns}
        />
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
