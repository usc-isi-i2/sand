import { Popover, Typography, Descriptions, Row, Col } from "antd";
import { Entity } from ".";
import { withStyles, WithStyles } from "@material-ui/styles";
import { ExternalLink, LoadingPage } from "rma-baseapp";
import { StatementComponent } from "./StatementComponent";
import { PropertyComponent } from "./PropertyComponent";
const styles = {
  root: {
    "& > h2, p, span": {
      margin: 0,
    },
    minWidth: 360,
  },
};

export const PageEntityComponent = withStyles(styles)(
  ({ entity }: { entity: Entity } & WithStyles<typeof styles>) => {
    return (
      <div>
        <h2>
          <ExternalLink href={Entity.id2uri(entity.id)}>
            {" "}
            {entity.label["en"]}
          </ExternalLink>
        </h2>
        <p>
          <i>({entity.id})</i>
        </p>
        <Typography.Text type="secondary">
          {entity.aliases["en"].join(" | ")}
        </Typography.Text>
        <p>{entity.description["en"]}</p>
        <hr />
        <PropertyComponent entity={entity} />
      </div>
    );
  }
);
