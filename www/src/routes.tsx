import {
  PathDef,
  NoArgsPathDef,
  NoQueryArgsPathDef,
  applyLayout,
} from "gena-app";
import { HomePage, ProjectPage, TablePage, SettingPage } from "./pages";

import React from "react";
import { LeftNavBar } from "./components/Navbar";
import { Space } from "antd";
import logo from "./logo.png";

import {
  CloudUploadOutlined,
  ProjectOutlined,
  SettingOutlined,
} from "@ant-design/icons";

/*************************************************************************************
 * Layouts of the application
 */
export const Layout = (
  component: React.FunctionComponent<any> | React.ComponentClass<any, any>
) => {
  return (props: any) => {
    const element = React.createElement(component, props);
    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        <LeftNavBar
          menus={{
            home: <img src={logo} alt="logo" />,
            projects: { icon: <ProjectOutlined />, children: "Projects" },
            upload: { icon: <CloudUploadOutlined />, children: "Upload" },
            settings: { icon: <SettingOutlined />, children: "Settings" },
          }}
          routes={routes}
          isFirstItemLogo={true}
        />
        <div className="wide-container">{element}</div>
      </Space>
    );
  };
};

const None = () => <h1>Not supposed to see this page</h1>;

/*************************************************************************************
 * Definitions for routes in this application
 */
export const routes = {
  project: new NoQueryArgsPathDef({
    component: ProjectPage,
    urlSchema: { projectId: "number" },
    pathDef: "/projects/:projectId",
  }),
  table: new PathDef({
    component: TablePage,
    urlSchema: { tableId: "number" },
    querySchema: { query: "string" },
    pathDef: "/tables/:tableId",
  }),
  tableExportModel: new PathDef({
    component: None,
    urlSchema: { tableId: "number" },
    querySchema: { attachment: "optionalboolean" },
    pathDef: "/api/table/:tableId/export-models",
  }),
  tableExportData: new PathDef({
    component: None,
    urlSchema: { tableId: "number" },
    querySchema: { attachment: "optionalboolean" },
    pathDef: "/api/table/:tableId/export",
  }),
  settings: new NoArgsPathDef({
    component: SettingPage,
    pathDef: "/settings",
    exact: true,
  }),
  upload: new NoArgsPathDef({
    component: HomePage,
    pathDef: "/upload",
    exact: true,
  }),
  projects: new NoArgsPathDef({
    component: HomePage,
    pathDef: "/projects",
    exact: true,
  }),
  home: new NoArgsPathDef({ component: HomePage, pathDef: "/", exact: true }),
};
(window as any)._routes = routes;

// apply this layout to all routes except table
applyLayout(routes, Layout, ["table"]);
