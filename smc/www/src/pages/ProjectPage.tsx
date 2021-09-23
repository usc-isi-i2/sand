import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { Project, Table, useStores } from "../models";
import { useParams } from "react-router-dom";
import { InternalLink, RouteConf, RouteURLArgs_project } from "../routing";
import React from "react";
import { ProjectNavBar } from "../components/NavBar";
import NotFound404 from "./NotFound404";
import LoadingPage from "./LoadingPage";
import ProTable from "@ant-design/pro-table";
import { withStyles, WithStyles } from "@material-ui/styles";

const styles = {
  table: {
    marginTop: 8,
    "& div.ant-table-container": {
      border: "1px solid #bbb",
      borderRadius: 4,
      borderLeft: "1px solid #bbb !important",
    },
  },
};

const ProjectPage = withStyles(styles)(
  observer(({ classes }: WithStyles<typeof styles>) => {
    const projectId = parseInt(useParams<RouteURLArgs_project>().projectId);

    const { ProjectStore, TableStore } = useStores();
    const [invalidID, setInvalidID] = useState(false);

    useEffect(() => {
      if (ProjectStore.get(projectId) === undefined) {
        ProjectStore.fetch(projectId).then((project) => {
          if (project === undefined) {
            setInvalidID(true);
            return;
          }
        });
      }
    }, [projectId]);

    const project = ProjectStore.get(projectId);
    if (project === undefined) {
      if (invalidID) return <NotFound404 />;
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
              path={RouteConf.table}
              urlArgs={{ tableId: tbl.id.toString() }}
              queryArgs={{
                query: ProjectStore.encodeWhereQuery({ project: projectId }),
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
        <ProjectNavBar project={ProjectStore.get(projectId)} />
        <ProTable<ReturnType<typeof table2row>>
          className={classes.table}
          size="small"
          bordered={true}
          request={async (params, sort, filter) => {
            let result = await TableStore.fetchSome({
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
          headerTitle={<h2>Tables</h2>}
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

export default ProjectPage;

function table2row(tbl: Table) {
  return {
    id: tbl.id,
    name: tbl.name,
    description: tbl.description,
  };
}
