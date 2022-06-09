import { withStyles, WithStyles } from "@material-ui/styles";
import { Col, Row, Typography } from "antd";
import { Statement } from "../../models/entity";
import { ID2Prop } from "./Entity";
import { InlinePropertyComponent } from "./InlinePropertyComponent";
import { ValueComponent } from "./ValueComponent";

const styles = {
  qualifiers: {
    marginLeft: 24,
  },
};

export const StatementComponent = withStyles(styles)(
  ({
    stmt,
    classes,
    id2prop,
    ...restprops
  }: {
    id2prop: ID2Prop;
    stmt: Statement;
  } & WithStyles<typeof styles> &
    React.HTMLProps<HTMLDivElement>) => {
    const qualifiers = [];
    for (const qid of stmt.qualifiersOrder) {
      let qval;
      if (stmt.qualifiers[qid].length === 0) {
        qval = (
          <Typography.Text type="secondary" italic={true}>
            no value
          </Typography.Text>
        );
      } else {
        qval = stmt.qualifiers[qid].map((value, valueIndex) => {
          return (
            <div key={valueIndex}>
              <ValueComponent value={value} />
            </div>
          );
        });
      }

      qualifiers.push(
        <Row gutter={8} key={qid}>
          <Col span={6}>
            <InlinePropertyComponent property={id2prop[qid]} />
          </Col>
          <Col span={18}>{qval}</Col>
        </Row>
      );
    }

    return (
      <div {...restprops}>
        <div>
          <ValueComponent value={stmt.value} />
        </div>
        <div className={classes.qualifiers}>{qualifiers}</div>
      </div>
    );
  }
);
