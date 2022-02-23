import { WithStyles, withStyles } from "@material-ui/styles";
import { Select } from "antd";
import { observer } from "mobx-react";
import React, { useMemo } from "react";
import { SequentialFuncInvoker } from "../../misc";
import { SemanticModel, useStores } from "../../models";
import { SMNodeType } from "../../models/sm";

const styles = {
  selection: {
    width: "100%",
  },
};

export type SearchValue = { type: SMNodeType | "class"; id: string };

export const NodeSearchComponent = withStyles(styles)(
  observer(
    ({
      sm,
      value,
      onDeselect,
      onSelect,
      classes,
    }: {
      sm: SemanticModel;
      value?: SearchValue;
      onDeselect: (value: SearchValue) => void;
      onSelect: (value: SearchValue) => void;
    } & WithStyles<typeof styles>) => {
      const { classStore } = useStores();
      const seqInvoker = new SequentialFuncInvoker();

      // gather all options already in the store, leverage the fact
      // that property store is readonly
      const options = useMemo(() => {
        const options: ({
          value: string;
          label: string;
        } & SearchValue)[] = [];
        for (const r of classStore.iter()) {
          options.push({
            type: "class",
            id: r.id,
            value: `class:${r.id}`,
            label: sm.graph.uriCount.nextLabel(r.uri, r.readableLabel),
          });
        }

        for (const u of sm.graph.nodes) {
          options.push({
            type: u.nodetype,
            id: u.id,
            value: `${u.nodetype}:${u.id}`,
            label: sm.graph.uriCount.label(u),
          });
        }
        return options;
      }, [classStore.records.size]);

      // search for additional values if it's not in the list
      const onSearch = (query: string) => {
        if (query === "") return;
        seqInvoker.exec(() => {
          return classStore.fetchById(query).then(() => 1);
        });
      };

      return (
        <Select
          allowClear={true}
          options={options}
          optionFilterProp="label"
          className={classes.selection}
          showSearch={true}
          onSearch={onSearch}
          value={value === undefined ? undefined : `${value.type}:${value.id}`}
          onSelect={(value, option) => {
            onSelect({ type: option.type, id: option.id });
          }}
          onDeselect={(value, option) => {
            onDeselect({ type: option.type, id: option.id });
          }}
        />
      );
    }
  )
);
