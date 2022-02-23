import { WithStyles, withStyles } from "@material-ui/styles";
import { Select } from "antd";
import { observer } from "mobx-react";
import React, { useEffect, useMemo } from "react";
import { SequentialFuncInvoker } from "../../misc";
import { useStores } from "../../models";

const styles = {
  selection: {
    width: "100%",
  },
};

type SearchProps = {
  value?: string | string[];
  onDeselect?: (value: string) => void;
  onSelect?: (value: string) => void;
  mode?: "multiple" | "tags";
} & WithStyles<typeof styles>;

export const OntPropSearchComponent = withStyles(styles)(
  observer((props: SearchProps) => {
    return useSearchComponent("propertyStore", props);
  })
);

export const OntClassSearchComponent = withStyles(styles)(
  observer((props: SearchProps) => {
    return useSearchComponent("classStore", props);
  })
);

export const EntitySearchComponent = withStyles(styles)(
  observer((props: SearchProps) => {
    return useSearchComponent("entityStore", props);
  })
);

function useSearchComponent(
  storeName: "propertyStore" | "classStore" | "entityStore",
  props: SearchProps
) {
  const store = useStores()[storeName];
  const seqInvoker = new SequentialFuncInvoker();

  // when the provided value is not in the store, fetch it
  useEffect(() => {
    if (props.value === undefined) {
      return;
    }

    if (Array.isArray(props.value)) {
      // leverage the fact that the three stores are not re-fetched
      if (!store.refetch) {
        store.fetchByIds(props.value);
      } else {
        store.fetchByIds(props.value.filter((id) => !store.records.has(id)));
      }
    } else if (store.get(props.value) === undefined) {
      store.fetchById(props.value);
    }
  }, [props.value]);

  // gather all options already in the store, leverage the fact
  // that property store is readonly
  const options = useMemo(() => {
    const options = [];
    for (const r of store.iter()) {
      options.push({
        value: r.id,
        label: r.readableLabel,
      });
    }
    return options;
  }, [store.records.size]);

  // search for additional properties if it's not in the list
  const onSearch = (query: string) => {
    if (query === "") return;
    seqInvoker.exec(() => {
      return store.fetchById(query).then(() => 1);
    });
  };

  return (
    <Select
      mode={props.mode}
      allowClear={true}
      options={options}
      optionFilterProp="label"
      className={props.classes.selection}
      showSearch={true}
      onSearch={onSearch}
      value={props.value}
      onSelect={props.onSelect as any}
      onDeselect={props.onDeselect as any}
    />
  );
}
