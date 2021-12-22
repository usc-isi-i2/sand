import { withStyles, WithStyles } from "@material-ui/styles";
import { Checkbox, Select } from "antd";
import { observer } from "mobx-react";
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
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
      id2prop,
      filteredProps,
      setFilteredProps,
      classes,
    }: {
      entity: Entity;
      id2prop: ID2Prop;
      filteredProps: string[];
      setFilteredProps: (props: string[]) => void;
    } & WithStyles<typeof styles>) => {
      const [enable, setEnable] = useState(true);

      const props = useMemo(() => {
        return Object.keys(entity.properties).map((pid) => ({
          label: `${id2prop[pid].label} (${pid})`,
          value: pid,
        }));
      }, [id2prop, entity.id]);

      const onSelect = (value: string) => {
        setFilteredProps(filteredProps.concat([value]));
      };

      const onDeselect = (value: string) => {
        setFilteredProps(filteredProps.filter((pid) => pid !== value));
      };

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
            onSelect={onSelect}
            onDeselect={onDeselect}
          />
        </div>
      );
    }
  )
);
