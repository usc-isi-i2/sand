import { withStyles, WithStyles } from "@material-ui/styles";
import { Col, Row } from "antd";
import { Statement } from "../../models/entity";
import { ValueComponent } from "./ValueComponent";

const styles = {
  qualifiers: {
    marginLeft: 8,
  },
};

export const StatementComponent = withStyles(styles)(
  ({ stmt, classes }: { stmt: Statement } & WithStyles<typeof styles>) => {
    const qualifiers = [];
    for (const qid of stmt.qualifiersOrder) {
      qualifiers.push(
        <Row gutter={8} key={qid}>
          <Col span={6}>{qid}</Col>
          <Col span={18}>
            {stmt.qualifiers[qid].map((value, valueIndex) => {
              return (
                <div key={valueIndex}>
                  <ValueComponent value={value} />
                </div>
              );
            })}
          </Col>
        </Row>
      );
    }

    return (
      <div>
        <div>
          <ValueComponent value={stmt.value} />
        </div>
        <div className={classes.qualifiers}>{qualifiers}</div>
      </div>
    );
  }
);
