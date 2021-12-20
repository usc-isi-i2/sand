import { withStyles, WithStyles } from "@material-ui/styles";
import { Col, Row, Typography } from "antd";
import { Entity } from "../../models/entity";
import { StatementComponent } from "./StatementComponent";

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
      // we have undefined when entity does not have this property `pid`
      const stmts = entity.properties[pid] || [];
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
