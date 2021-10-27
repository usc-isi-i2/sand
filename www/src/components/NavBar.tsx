import { PageHeader, Space } from "antd";
import React from "react";
import { routes } from "../routes";
import { history } from "rma-baseapp";
import _ from "lodash";
import { Project, Table } from "../models";

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
          routes.project.getURL({
            projectId: props.table.project,
          })
        )
      }
      title={
        <Space>
          <span style={{ fontWeight: 500 }}>Table </span>
          <span style={{ color: "#237804", textDecoration: "underline" }}>
            {props.table.name}
          </span>
        </Space>
      }
      subTitle={
        <Space>
          <span>
            (Project <b>{project.name}</b>)
          </span>
          {props.extraSubTitle}
        </Space>
      }
      extra={props.btns}
    />
  );
};
