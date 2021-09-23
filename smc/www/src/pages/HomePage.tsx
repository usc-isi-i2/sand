import { Avatar, Col, List, Row } from "antd";
import { toJS } from "mobx";
import { inject, observer } from "mobx-react";
import React, { useEffect } from "react";
import { HomeNavBar } from "../components/NavBar";
import { useStores } from "../models";
import { InternalLink, RouteConf } from "../routing";

const HomePage = observer(() => {
  const { ProjectStore: projects } = useStores();

  useEffect(() => {
    projects.fetchSome({ limit: 100, offset: 0 });
  }, []);

  return (
    <React.Fragment>
      <HomeNavBar />
      <Row gutter={16}>
        <Col className="gutter-row" span={24}>
          <h2>Projects</h2>
          <List
            size="small"
            bordered={true}
            itemLayout="horizontal"
            dataSource={projects.list}
            renderItem={(project) => (
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
                          "#ffbf00",
                          "#00a2ae",
                        ][0],
                      }}
                    >
                      D
                    </Avatar>
                  }
                  title={
                    <InternalLink
                      path={RouteConf.project}
                      urlArgs={{ projectId: project.id.toString() }}
                      queryArgs={null}
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

export default HomePage;
