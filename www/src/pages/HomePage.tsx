import { Avatar, Col, List, Row, Typography } from "antd";
import { observer } from "mobx-react";
import React, { useEffect } from "react";
import { InternalLink } from "rma-baseapp";
import { useStores } from "../models";
import { routes } from "../routes";

export const HomePage = observer(() => {
  const { projectStore } = useStores();

  useEffect(() => {
    projectStore.fetch({ limit: 100, offset: 0 });
  }, [projectStore]);

  return (
    <React.Fragment>
      <Row gutter={16}>
        <Col className="gutter-row" span={24}>
          <Typography.Title level={3}>Projects</Typography.Title>
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
                        backgroundColor: [
                          "#f56a00",
                          "#7265e6",
                          "#1890ff",
                          "#00a2ae",
                        ][project.name.charCodeAt(0) % 4],
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
