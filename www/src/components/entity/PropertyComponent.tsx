import { withStyles, WithStyles } from "@material-ui/styles";
import { Col, Row, Typography } from "antd";
import React from "react";
import { FetchEntityComponent, InlineEntityComponent } from ".";
import { Entity, Statement } from "../../models/entity";
import { StatementComponent } from "./StatementComponent";
import { ValueComponent } from "./ValueComponent";

const styles = {};

export const PropertyComponent = withStyles(styles)(
  ({
    entity,
    visibleProperties,
    classes,
  }: { entity: Entity; visibleProperties?: string[] } & WithStyles<
    typeof styles
  >) => {
    if (visibleProperties === undefined) {
      visibleProperties = Object.keys(entity.properties);
    }

    const components = [];
    for (const pid of visibleProperties) {
      const stmts = entity.properties[pid];
      components.push(
        <Row gutter={8} key={pid}>
          <Col span={6}>
            <Typography.Text strong={true}>{pid}</Typography.Text>
          </Col>
          <Col span={18}>
            {stmts.map((stmt, idx) => {
              return <StatementComponent key={idx} stmt={stmt} />;
            })}
          </Col>
        </Row>
      );
    }

    return <div>{components}</div>;
  }
);
