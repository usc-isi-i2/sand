import { gold, green, purple } from "@ant-design/colors";
import { WithStyles, withStyles } from "@material-ui/styles";
import { Select, Spin } from "antd";
import { observer } from "mobx-react";
import React, { useMemo, useState } from "react";
import { SequentialFuncInvoker } from "../../misc";
import { TextSearchResult } from "../../models/ontology/ClassStore";
import { SemanticModel, useStores } from "../../models";
import { SMNodeType } from "../../models/sm";
import { debounce } from "lodash";
import LabelComponent from "../../components/search/LabelComponent";
import SpinComponent from "../../components/search/SpinComponent";

const styles = {
  selection: {
    width: "100%",
  },
  class_node: {
    backgroundColor: green[2],
    "&:hover": {
      backgroundColor: green[8],
      color: "white",
    },
  },
  literal_node: {
    backgroundColor: purple[2],
    "&:hover": {
      backgroundColor: purple[8],
      color: "white",
    },
  },
  data_node: {
    backgroundColor: gold[2],
    "&:hover": {
      backgroundColor: gold[8],
      color: "white",
    },
  },
};

export interface SearchOptions {
  id: string;
  value: string;
  label: any;
  filterlabel: string;
  type: SMNodeType | "class";
}

export type SearchValue = { type: SMNodeType | "class"; id: string };

export const NodeSearchComponent = withStyles(styles)(
  observer(
    ({
      sm,
      value,
      onDeselect,
      onSelect,
      classes,
      classSearchOnly,
    }: {
      sm: SemanticModel;
      value?: SearchValue;
      onDeselect: (value: SearchValue) => void;
      onSelect: (value: SearchValue) => void;
      classSearchOnly: boolean;
    } & WithStyles<typeof styles>) => {
      const { classStore } = useStores();
      const [searchOptions, setSearchOptions] = useState<SearchOptions[]>();

      // Loader Option to display Spin component to represent loader on
      // searching the classes and entities
      const loaderOption: SearchOptions = {
        type: "class",
        id: "",
        label: (
          <SpinComponent/>
        ),
        filterlabel: ``,
        value: ``,
      };

      // gather all options already in the store, leverage the fact
      // that property store is readonly
      const options = useMemo(() => {
        const options: SearchOptions[] = [];

        if (classSearchOnly) {
          for (const u of sm.graph.nodes) {
            if (u.nodetype == "class_node") {
              options.push({
                type: u.nodetype,
                id: u.id,
                value: `${u.nodetype}:${u.id}`,
                label: sm.graph.uriCount.label(u),
                filterlabel: sm.graph.uriCount.label(u),
                className: classes[u.nodetype],
              } as any);
            }
          }
        } else {
          for (const u of sm.graph.nodes) {
            options.push({
              type: u.nodetype,
              id: u.id,
              value: `${u.nodetype}:${u.id}`,
              label: sm.graph.uriCount.label(u),
              filterlabel: sm.graph.uriCount.label(u),
              className: classes[u.nodetype],
            } as any);
          }
        }

        setSearchOptions([...options]);
        return options;
      }, [sm.graph.version]);

      // search for additional values if it's not in the list
      const onSearch = (query: string) => {
        if (query === "") {
          setSearchOptions([...options]);
          return;
        }
        const searchResults: SearchOptions[] = [];
        loaderOption.filterlabel = query;

        setSearchOptions([...options, loaderOption]);

        classStore
          .fetchSearchResults(query)
          .then((data) => {
            data.forEach((searchResult: TextSearchResult) => {
              searchResults.push({
                type: "class",
                id: searchResult.id,
                label: (
                  <LabelComponent id={searchResult.id} label={searchResult.label}
                   description={searchResult.description} uri={""} />
                ),
                filterlabel: `${searchResult.label} (${searchResult.id})`,
                value: `class:${searchResult.id}`,
              });
            });
            return searchResults;
          })
          .then((searchResults) => {
            setSearchOptions([...options, ...searchResults]);
          })
          .catch(function (error: any) {
            console.error(error);
          });
      };

      return (
        <Select
          allowClear={true}
          options={searchOptions}
          onClear={() => setSearchOptions([...options])}
          optionFilterProp="filterlabel"
          defaultActiveFirstOption={false}
          className={classes.selection}
          showSearch={true}
          onSearch={debounce(onSearch, 300)}
          value={value === undefined ? undefined : `${value.type}:${value.id}`}
          onSelect={(value: any, option: SearchOptions) => {
            console.log(option);
            if (option.type == "class") {
              classStore.fetchById(option.id).then(() => {
                onSelect({ type: "class", id: option.id });
              });
            } else {
              onSelect({ type: option.type, id: option.id });
            }
          }}
          onDeselect={(value: any, option: SearchValue) => {
            onDeselect({ type: option.type, id: option.id });
          }}
        />
      );
    }
  )
);

