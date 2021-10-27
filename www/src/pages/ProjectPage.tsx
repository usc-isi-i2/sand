import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { Table, useStores } from "../models";
import { useParams } from "react-router-dom";
import { routes } from "../routes";
import { InternalLink } from "rma-baseapp";
import React from "react";
import _ from "lodash";
import { LoadingPage, NotFoundPage } from "rma-baseapp";
import ProTable from "@ant-design/pro-table";
import { withStyles, WithStyles } from "@material-ui/styles";
import { Typography } from "antd";

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
    const [invalidID, setInvalidID] = useState(false);

    useEffect(() => {
      if (projectStore.get(projectId) === undefined) {
        projectStore.fetch(projectId).then((project) => {
          if (project === undefined) {
            setInvalidID(true);
            return;
          }
        });
      }
    }, [projectId]);

    const project = projectStore.get(projectId);
    if (project === undefined) {
      if (invalidID) return <NotFoundPage />;
      return <LoadingPage />;
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
            let result = await tableStore.fetchSome({
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
