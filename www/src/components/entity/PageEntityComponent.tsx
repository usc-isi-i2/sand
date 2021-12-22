import { withStyles, WithStyles } from "@material-ui/styles";
import { Modal, Space, Typography } from "antd";
import { ExternalLink } from "rma-baseapp";
import { FetchEntityComponent } from "./FetchEntityComponent";
import { Entity, useEntityProperties } from "./Entity";
import { PropertyComponent } from "./PropertyComponent";
import { PropertyFilterComponent } from "./PropertyFilterComponent";
import { useState } from "react";
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
    const id2prop = useEntityProperties(entity);
    const [filteredProps, setFilteredProps] = useState<string[]>([]);

    return (
      <div>
        <Space style={{ float: "right" }}>
          <PropertyFilterComponent
            entity={entity}
            id2prop={id2prop}
            filteredProps={filteredProps}
            setFilteredProps={setFilteredProps}
          />
        </Space>
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
        <PropertyComponent
          entity={entity}
          id2prop={id2prop}
          visibleProperties={
            filteredProps.length > 0 ? filteredProps : undefined
          }
        />
      </div>
    );
  }
);

/** Open a full page of entity as a modal */
export function openPageEntityComponent(
  entity: Entity | string,
  zIndex?: number
) {
  let content;
  if (entity instanceof Entity) {
    content = <PageEntityComponent entity={entity} />;
  } else {
    content = (
      <FetchEntityComponent
        entityId={entity}
        render={(entity: Entity) => <PageEntityComponent entity={entity} />}
      />
    );
  }

  Modal.info({
    icon: null,
    content,
    bodyStyle: { margin: -8, marginTop: -16 },
    okButtonProps: { style: { display: "none" } },
    maskClosable: true,
    mask: true,
    zIndex: zIndex,
    width: "calc(100% - 64px)",
    style: { top: 32 },
  });
}
