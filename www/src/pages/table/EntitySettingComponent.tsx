import { WithStyles, withStyles } from "@material-ui/styles";
import { Descriptions } from "antd";
import { observer } from "mobx-react";
import React from "react";
import { useStores } from "../../models";
import { OntPropSearchComponent } from "./OntSearchComponent";

const styles = {};

export const EntitySettingComponent = withStyles(styles)(
  observer(({ classes }: {} & WithStyles<typeof styles>) => {
    const { entityStore } = useStores();

    return (
      <Descriptions title="Entity Settings" size="small" column={1}>
        <Descriptions.Item label="Properties (full view)">
          <OntPropSearchComponent
            mode="multiple"
            value={entityStore.settings.showedPropsInFullView}
            onSelect={entityStore.settings.addShowedPropsInFullView}
            onDeselect={entityStore.settings.removeShowedPropsInFullView}
          />
        </Descriptions.Item>
        <Descriptions.Item label="Properties (popover view)">
          <OntPropSearchComponent
            mode="multiple"
            value={entityStore.settings.showedPropsInPopoverView}
            onSelect={entityStore.settings.addShowedPropsInPopoverView as any}
            onDeselect={
              entityStore.settings.removeShowedPropsInPopoverView as any
            }
          />
        </Descriptions.Item>
      </Descriptions>
    );
  })
);
