import { withStyles, WithStyles } from "@material-ui/styles";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { Popover, Typography } from "antd";
import React from "react";
import { ExternalLink } from "rma-baseapp";
import { Entity, useEntityProperties } from "./Entity";
import { openPageEntityComponent } from "./PageEntityComponent";
import { PropertyComponent } from "./PropertyComponent";

const styles = {
  root: {
    "& > h2, p, span": {
      margin: 0,
    },
    minWidth: 600,
  },
};

/**
 * Showing entity in popover mode.
 *
 * To control which one to show first, set the zIndex property of the popover.
 */
export const PopoverEntityComponent = withStyles(styles)(
  ({
    entity,
    children,
    classes,
    zIndex,
    ...restprops
  }: {
    entity: Entity;
    zIndex?: number;
  } & React.HTMLProps<HTMLDivElement> &
    WithStyles<typeof styles>) => {
    // TODO: find a way to remove this hard code
    const instanceOf = "P31";
    const id2prop = useEntityProperties(entity);
    const content = (
      <div {...restprops} className={`${classes.root} ${restprops.className}`}>
        <h2>
          <ExternalLink href={Entity.id2uri(entity.id)} openInNewPage={true}>
            {" "}
            {entity.label["en"]}
          </ExternalLink>
          <UnfoldMoreIcon
            style={{ marginBottom: -2, paddingTop: 4, cursor: "pointer" }}
            onClick={() => {
              openPageEntityComponent(
                entity,
                zIndex !== undefined ? zIndex + 1 : undefined
              );
            }}
          />
        </h2>
        <p>
          <i>({entity.id})</i>
        </p>
        <Typography.Text type="secondary">
          {entity.aliases["en"].join(" | ")}
        </Typography.Text>
        <p>{entity.description["en"]}</p>
        <hr />
        <PropertyComponent
          id2prop={id2prop}
          entity={entity}
          visibleProperties={[instanceOf]}
        />
      </div>
    );

    return (
      <Popover content={content} zIndex={zIndex}>
        {children}
      </Popover>
    );
  }
);
