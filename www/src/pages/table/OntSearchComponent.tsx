import { WithStyles, withStyles } from "@material-ui/styles";
import { Select } from "antd";
import { observer } from "mobx-react";
import React, { useMemo } from "react";
import { SequentialFuncInvoker } from "../../misc";
import { useStores } from "../../models";

const styles = {
  selection: {
    width: "100%",
  },
};

export const OntPropSearchComponent = withStyles(styles)(
  observer(
    ({
      classes,
      value,
      onSelect,
      onDeselect,
      mode,
    }: {
      value?: string | string[];
      onDeselect?: (value: string) => void;
      onSelect?: (value: string) => void;
      mode?: "multiple" | "tags";
    } & WithStyles<typeof styles>) => {
      const { propertyStore } = useStores();
      const seqInvoker = new SequentialFuncInvoker();

      // gather all options already in the store, leverage the fact
      // that property store is readonly
      const options = useMemo(() => {
        const options = [];
        for (const prop of propertyStore.iter()) {
          options.push({
            value: prop.id,
            label: prop.readableLabel,
          });
        }
        return options;
      }, [propertyStore.records.size]);

      // search for additional properties if it's not in the list
      const onSearch = (query: string) => {
        if (query === "") return;
        seqInvoker.exec(() => {
          return propertyStore.fetchById(query);
        });
      };

      return (
        <Select
          mode={mode}
          allowClear={true}
          options={options}
          optionFilterProp="label"
          className={classes.selection}
          showSearch={true}
          onSearch={onSearch}
          value={value}
          onSelect={onSelect as any}
          onDeselect={onDeselect as any}
        />
      );
    }
  )
);

export const OntClassSearchComponent = withStyles(styles)(
  observer(
    ({
      classes,
      value,
      onSelect,
      onDeselect,
      mode,
    }: {
      value?: string;
      onDeselect?: (value: string) => void;
      onSelect?: (value: string) => void;
      mode?: "multiple" | "tags";
    } & WithStyles<typeof styles>) => {
      const { classStore } = useStores();
      const seqInvoker = new SequentialFuncInvoker();

      // gather all options already in the store, leverage the fact
      // that the class store is readonly
      const options = useMemo(() => {
        const options = [];
        for (const cls of classStore.iter()) {
          options.push({
            value: cls.id,
            label: cls.readableLabel,
          });
        }
        return options;
      }, [classStore.records.size]);

      // search for additional properties if it's not in the list
      const onSearch = (query: string) => {
        if (query === "") return;
        seqInvoker.exec(() => {
          return classStore.fetchById(query);
        });
      };

      return (
        <Select
          mode={mode}
          allowClear={true}
          options={options}
          optionFilterProp="label"
          className={classes.selection}
          showSearch={true}
          onSearch={onSearch}
          value={value}
          onSelect={onSelect as any}
          onDeselect={onDeselect as any}
        />
      );
    }
  )
);
