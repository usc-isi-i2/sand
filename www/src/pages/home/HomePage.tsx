import { Avatar, Button, Col, List, Row, Typography } from "antd";
import { observer } from "mobx-react";
import React, { useEffect } from "react";
import { InternalLink } from "gena-app";
import { useStores } from "../../models";
import { routes } from "../../routes";

import {
  red,
  volcano,
  orange,
  gold,
  yellow,
  lime,
  green,
  cyan,
  blue,
  geekblue,
  purple,
  magenta,
} from "@ant-design/colors";
import { openNewProjectForm } from "../project/forms/NewProjectForm";

// const colorWheels = ["#f56a00", "#7265e6", "#1890ff", "#00a2ae"];
const colorWheels = [
  red[5],
  volcano[5],
  blue[5],
  gold[5],
  orange[5],
  yellow[5],
  lime[5],
  green[5],
  cyan[5],
  geekblue[5],
  purple[5],
  magenta[5],
];

export const HomePage = observer(() => {
  const { projectStore } = useStores();

  useEffect(() => {
    projectStore.fetch({ limit: 100, offset: 0 });
  }, [projectStore]);

  return (
    <React.Fragment>
      <Row gutter={16}>
        <Col className="gutter-row" span={16}>
          <Typography.Title level={3}>Projects</Typography.Title>
        </Col>
        <Col className="gutter-row" span={8}>
          <Button
            style={{ float: "right" }}
            type="primary"
            onClick={() => openNewProjectForm()}
          >
            New Project
          </Button>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col className="gutter-row" span={24}>
          <List
            size="small"
            bordered={true}
            itemLayout="horizontal"
            dataSource={projectStore.list}
            renderItem={(project, i) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar
                      shape="square"
                      size="large"
                      style={{
                        marginTop: 4,
                        backgroundColor:
                          colorWheels[
                            project.name.charCodeAt(0) % colorWheels.length
                          ],
                      }}
                    >
                      {project.name[0].toUpperCase()}
                    </Avatar>
                  }
                  title={
                    <InternalLink
                      path={routes.project}
                      urlArgs={{ projectId: project.id }}
                      queryArgs={{}}
                    >
                      {project.name}
                    </InternalLink>
                  }
                  description={project.description}
                />
              </List.Item>
            )}
          />
        </Col>
      </Row>
    </React.Fragment>
  );
});
