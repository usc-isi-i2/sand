import { withStyles, WithStyles } from "@material-ui/styles";
import { Modal, Space, Typography } from "antd";
import { ExternalLink } from "gena-app";
import { FetchEntityComponent } from "./FetchEntityComponent";
import { Entity, useEntityProperties } from "./Entity";
import { PropertyComponent } from "./PropertyComponent";
import { PropertyFilterComponent } from "./PropertyFilterComponent";
import { useState } from "react";
import { EntitySettings } from "../../models";
import { observer } from "mobx-react";
const styles = {
  root: {
    "& > h2, p, span": {
      margin: 0,
    },
    minWidth: 360,
  },
};

export const PageEntityComponent = withStyles(styles)(
  observer(
    ({
      entity,
      settings,
    }: { entity: Entity; settings: EntitySettings } & WithStyles<
      typeof styles
    >) => {
      const id2prop = useEntityProperties(entity);
      const [enable, setEnable] = useState<boolean>(true);

      return (
        <div>
          <Space style={{ float: "right" }}>
            <PropertyFilterComponent
              enable={enable}
              setEnable={setEnable}
              entity={entity}
              id2prop={id2prop}
              filteredProps={settings.showedPropsInFullView}
              addFilteredProp={settings.addShowedPropsInFullView}
              removeFilteredProp={settings.removeShowedPropsInFullView}
            />
          </Space>
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
          </h2>
          <Typography.Text type="secondary">
            {entity.aliases.lang2values[entity.aliases.lang].join(" | ")}
          </Typography.Text>
          <p>{entity.description.lang2value[entity.description.lang]}</p>
          <hr />
          <PropertyComponent
            entity={entity}
            id2prop={id2prop}
            showId={true}
            filteredProps={enable ? settings.showedPropsInFullView : []}
          />
        </div>
      );
    }
  )
);

/** Open a full page of entity as a modal */
export function openPageEntityComponent(
  args: { entity: Entity; settings: EntitySettings } | string,
  zIndex?: number
) {
  // avoid using instanceof Entity because it's going to be proxy object due to mobx
  const isEntity = typeof args !== "string";
  let content;
  if (isEntity) {
    content = (
      <PageEntityComponent entity={args.entity} settings={args.settings} />
    );
  } else {
    content = (
      <FetchEntityComponent
        entityId={args}
        render={(entity, settings) => (
          <PageEntityComponent entity={entity} settings={settings} />
        )}
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
    width: "calc(100% - 128px)",
    style: { top: 64 },
  });
}
