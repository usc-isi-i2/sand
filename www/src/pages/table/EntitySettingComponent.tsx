import { WithStyles, withStyles } from "@material-ui/styles";
import { Descriptions } from "antd";
import { observer } from "mobx-react";
import React from "react";
import { useStores } from "../../models";
import { OntPropSearchComponent } from "./OntSearchComponent";

const styles = {};

export const EntitySettingComponent = withStyles(styles)(
  observer(({ classes }: {} & WithStyles<typeof styles>) => {
    const { uiSettings } = useStores();

    return (
      <Descriptions title="Entity Settings" size="small" column={1}>
        <Descriptions.Item label="Properties (full view)">
          <OntPropSearchComponent
            mode="multiple"
            value={uiSettings.entity.showedPropsInFullView}
            onSelect={uiSettings.entity.addShowedPropsInFullView}
            onDeselect={uiSettings.entity.removeShowedPropsInFullView}
          />
        </Descriptions.Item>
        <Descriptions.Item label="Properties (popover view)">
          <OntPropSearchComponent
            mode="multiple"
            value={uiSettings.entity.showedPropsInPopoverView}
            onSelect={uiSettings.entity.addShowedPropsInPopoverView as any}
            onDeselect={uiSettings.entity.removeShowedPropsInPopoverView as any}
          />
        </Descriptions.Item>
      </Descriptions>
    );
  })
);
