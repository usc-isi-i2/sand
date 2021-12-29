import { WithStyles, withStyles } from "@material-ui/styles";
import { Descriptions, Select } from "antd";
import { observer } from "mobx-react";
import React, { useMemo } from "react";
import { SequentialFuncInvoker } from "../../misc";
import { Property, useStores } from "../../models";

const styles = {
  selection: {
    width: "100%",
  },
};

export const EntitySettingComponent = withStyles(styles)(
  observer(({ classes }: {} & WithStyles<typeof styles>) => {
    const { entityStore, propertyStore } = useStores();
    const seqInvoker = new SequentialFuncInvoker();

    // gather all options already in the store, leverage the fact
    // that property store is readonly
    const options = useMemo(() => {
      const options = [];
      for (const prop of propertyStore.iter()) {
        options.push({
          value: prop.id,
          label: `${prop.label} (${prop.id})`,
        });
      }
      return options;
    }, [propertyStore.records.size]);

    // search for additional properties if it's not in the list
    const onSearch = (query: string) => {
      if (query === "") return;
      seqInvoker.exec(() => {
        return propertyStore.fetchById(query.toUpperCase());
      });
    };

    return (
      <Descriptions title="Entity Settings" size="small" column={1}>
        <Descriptions.Item label="Properties (full view)">
          <Select
            mode="multiple"
            allowClear={true}
            options={options}
            optionFilterProp="label"
            className={classes.selection}
            onSearch={onSearch}
            value={entityStore.settings.showedPropsInFullView}
            onSelect={entityStore.settings.addShowedPropsInFullView}
            onDeselect={entityStore.settings.removeShowedPropsInFullView}
          />
        </Descriptions.Item>
        <Descriptions.Item label="Properties (popover view)">
          <Select
            mode="multiple"
            allowClear={true}
            options={options}
            optionFilterProp="label"
            className={classes.selection}
            onSearch={onSearch}
            value={entityStore.settings.showedPropsInPopoverView}
            onSelect={entityStore.settings.addShowedPropsInPopoverView}
            onDeselect={entityStore.settings.removeShowedPropsInPopoverView}
          />
        </Descriptions.Item>
      </Descriptions>
    );
  })
);
