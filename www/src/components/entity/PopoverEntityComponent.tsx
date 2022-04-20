import { withStyles, WithStyles } from "@material-ui/styles";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { Popover, Typography } from "antd";
import { observer } from "mobx-react";
import React from "react";
import { ExternalLink } from "gena-app";
import { EntitySettings } from "../../models";
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
  observer(
    ({
      entity,
      children,
      classes,
      zIndex,
      settings,
      ...restprops
    }: {
      entity: Entity;
      settings: EntitySettings;
      zIndex?: number;
    } & React.HTMLProps<HTMLDivElement> &
      WithStyles<typeof styles>) => {
      // TODO: find a way to remove this hard code
      const id2prop = useEntityProperties(entity);
      const content = (
        <div
          {...restprops}
          className={`${classes.root} ${restprops.className}`}
        >
          <h2>
            <ExternalLink href={entity.uri} openInNewPage={true}>
              {entity.label.lang2value[entity.label.lang]}
            </ExternalLink>
            &nbsp;
            <Typography.Text
              italic={true}
              strong={false}
              style={{ fontSize: 14, fontWeight: 400 }}
              copyable={{ text: entity.id }}
            >
              ({entity.id})
            </Typography.Text>
            <UnfoldMoreIcon
              style={{ marginBottom: -2, paddingTop: 4, cursor: "pointer" }}
              onClick={() => {
                openPageEntityComponent(
                  { entity, settings },
                  zIndex !== undefined ? zIndex + 1 : undefined
                );
              }}
            />
          </h2>
          <Typography.Text type="secondary">
            {entity.aliases.lang2values[entity.aliases.lang].join(" | ")}
          </Typography.Text>
          <p>{entity.description.lang2value[entity.description.lang]}</p>
          <hr />
          <PropertyComponent
            id2prop={id2prop}
            entity={entity}
            filteredProps={settings.showedPropsInPopoverView}
          />
        </div>
      );

      return (
        <Popover content={content} zIndex={zIndex}>
          {children}
        </Popover>
      );
    }
  )
);
