import { PageHeader } from "antd";
import React from "react";
import { RouteConf, history } from "../routing";
import _ from "lodash";
import { Project, Table } from "../models";

export const HomeNavBar = () => {
  return <PageHeader title="Home" className="site-page-header" />;
};

export const ProjectNavBar = (props: { project?: Project }) => {
  let project = props.project || new Project(0, "", "");
  return (
    <PageHeader
      onBack={() => history.push(RouteConf.home.getURL())}
      title={
        <React.Fragment>
          <span style={{ fontWeight: 500 }}>Project </span>
          <span style={{ color: "#237804", textDecoration: "underline" }}>
            {_.upperFirst(project.name)}
          </span>
        </React.Fragment>
      }
      className="site-page-header"
    />
  );
};

export const TableNavBar = (props: {
  project?: Project;
  table: Table;
  btns?: React.ReactNode[];
  extraSubTitle?: React.ReactNode;
}) => {
  let project = props.project || new Project(0, "", "");
  return (
    <PageHeader
      onBack={() =>
        history.push(
          RouteConf.project.getURL({
            projectId: props.table.project.toString(),
          })
        )
      }
      title={
        <React.Fragment>
          <span style={{ fontWeight: 500 }}>Table </span>
          <span style={{ color: "#237804", textDecoration: "underline" }}>
            {props.table.name}
          </span>
        </React.Fragment>
      }
      subTitle={
        <React.Fragment>
          <span>
            (Project <b>{project.name}</b>)
          </span>
          {props.extraSubTitle}
        </React.Fragment>
      }
      className="site-page-header"
      extra={props.btns}
    />
  );
};
