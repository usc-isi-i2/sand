import { withStyles, WithStyles } from "@material-ui/styles";
import { Typography } from "antd";
import { ExternalLink } from "rma-baseapp";
import { Entity } from ".";
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
