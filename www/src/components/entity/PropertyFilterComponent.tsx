import { withStyles, WithStyles } from "@material-ui/styles";
import { Checkbox, Select } from "antd";
import { observer } from "mobx-react";
import { useMemo } from "react";
import { Entity, ID2Prop } from "./Entity";

const styles = {
  root: {
    width: 240,
  },
};

export const PropertyFilterComponent = withStyles(styles)(
  observer(
    ({
      entity,
      enable,
      setEnable,
      id2prop,
      filteredProps,
      addFilteredProp,
      removeFilteredProp,
      classes,
    }: {
      enable: boolean;
      setEnable: (enable: boolean) => void;
      entity: Entity;
      id2prop: ID2Prop;
      filteredProps: string[];
      addFilteredProp: (prop: string) => void;
      removeFilteredProp: (prop: string) => void;
    } & WithStyles<typeof styles>) => {
      const props = useMemo(() => {
        return Object.keys(entity.properties).map((pid) => ({
          label: `${id2prop[pid].label} (${pid})`,
          value: pid,
        }));
      }, [id2prop, entity]);

      return (
        <div>
          <Checkbox onChange={() => setEnable(!enable)} checked={enable}>
            Enable Filtering
          </Checkbox>
          <Select
            mode="multiple"
            allowClear={true}
            options={props}
            optionFilterProp="label"
            className={classes.root}
            value={filteredProps}
            onSelect={addFilteredProp as any}
            onDeselect={removeFilteredProp as any}
          />
        </div>
      );
    }
  )
);
