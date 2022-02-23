import { withStyles, WithStyles } from "@material-ui/styles";
import { Col, Row, Space, Typography } from "antd";
import { observer } from "mobx-react";
import { ID2Prop } from ".";
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
      filteredProps,
      showId = false,
      classes,
    }: {
      entity: Entity;
      id2prop: ID2Prop;
      showId?: boolean;
      filteredProps: string[];
    } & WithStyles<typeof styles>) => {
      if (filteredProps.length === 0) {
        filteredProps = Object.keys(entity.properties);
      }

      const components = [];
      for (const pid of filteredProps) {
        // we have undefined when entity does not have this property `pid`
        if (entity.properties[pid] === undefined) continue;

        const stmts = entity.properties[pid];
        if (components.length > 0) {
          components.push(
            <hr key={`divider-${pid}`} className={classes.propDivider} />
          );
        }
        components.push(
          <Row gutter={8} key={pid}>
            <Col span={6}>
              <Typography.Text strong={true}>
                <InlinePropertyComponent
                  property={id2prop[pid]}
                  showId={showId}
                />
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
