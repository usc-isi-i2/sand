import { withStyles, WithStyles } from "@material-ui/styles";
import { Popover, Typography } from "antd";
import React from "react";
import { ExternalLink, LoadingPage } from "rma-baseapp";
import { Entity, IncompleteEntity, isEntityComplete } from ".";
import { PropertyComponent } from "./PropertyComponent";
const styles = {
  root: {
    "& > h2, p, span": {
      margin: 0,
    },
    minWidth: 360,
  },
};

export const PopoverEntityComponent = withStyles(styles)(
  ({
    entity,
    children,
    classes,
    ...restprops
  }: { entity: Entity | IncompleteEntity } & React.HTMLProps<HTMLDivElement> &
    WithStyles<typeof styles>) => {
    let content;

    if (!isEntityComplete(entity)) {
      if (entity.doesNotExist) {
        content = (
          <span>
            <i>Entity {entity.id} doesn't exist</i>
          </span>
        );
      } else {
        content = <LoadingPage />;
      }
    } else {
      content = (
        <div
          {...restprops}
          className={`${classes.root} ${restprops.className}`}
        >
          <h2>
            <ExternalLink href={Entity.id2uri(entity.id)} openInNewPage={true}>
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
          <PropertyComponent entity={entity} visibleProperties={["P31"]} />
        </div>
      );
    }

    return <Popover content={content}>{children}</Popover>;
  }
);
