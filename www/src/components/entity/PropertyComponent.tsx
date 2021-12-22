import { withStyles, WithStyles } from "@material-ui/styles";
import { Col, Divider, Row, Space, Typography } from "antd";
import { observer } from "mobx-react";
import { ID2Prop, IncompleteProperty, useEntityProperties } from ".";
import { Property } from "../../models";
import { Entity } from "../../models/entity";
import { InlinePropertyComponent } from "./InlinePropertyComponent";
import { StatementComponent } from "./StatementComponent";

const styles = {
  propDivider: {
    height: 1,
    border: "none",
    color: "#ddd",
    backgroundColor: "#ddd",
  },
};

export const PropertyComponent = withStyles(styles)(
  observer(
    ({
      entity,
      id2prop,
      visibleProperties,
      classes,
    }: {
      entity: Entity;
      id2prop: ID2Prop;
      visibleProperties?: string[];
    } & WithStyles<typeof styles>) => {
      if (visibleProperties === undefined) {
        visibleProperties = Object.keys(entity.properties);
      }

      const components = [];
      for (const pid of visibleProperties) {
        // we have undefined when entity does not have this property `pid`
        const stmts = entity.properties[pid] || [];
        if (components.length > 0) {
          components.push(
            <hr key={`divider-${pid}`} className={classes.propDivider} />
          );
        }
        components.push(
          <Row gutter={8} key={pid}>
            <Col span={6}>
              <Typography.Text strong={true}>
                <InlinePropertyComponent property={id2prop[pid]} />
              </Typography.Text>
            </Col>
            <Col span={18}>
              <Space direction="vertical" style={{ width: "100%" }}>
                {stmts.map((stmt, idx) => {
                  return (
                    <StatementComponent
                      key={idx}
                      stmt={stmt}
                      id2prop={id2prop}
                    />
                  );
                })}
              </Space>
            </Col>
          </Row>
        );
      }

      return (
        <Space direction="vertical" style={{ width: "100%" }} size={2}>
          {components}
        </Space>
      );
    }
  )
);
