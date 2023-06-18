import { gold, green, purple } from "@ant-design/colors";
import { WithStyles, withStyles } from "@material-ui/styles";
import { Select } from "antd";
import { observer } from "mobx-react";
import React, { useMemo, useState } from "react";
import { SequentialFuncInvoker } from "../../misc";
import { SemanticModel, useStores } from "../../models";
import { SMNodeType } from "../../models/sm";
import { debounce } from "lodash";

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

export interface SearchResult {
  id: string;
  label: string;
  description: string;
  uri: string;
}

export interface SearchOptions {
  id: string;
  value: string;
  label: any;
  element: SearchResult;
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
    }: {
      sm: SemanticModel;
      value?: SearchValue;
      onDeselect: (value: SearchValue) => void;
      onSelect: (value: SearchValue) => void;
    } & WithStyles<typeof styles>) => {
      const { classStore } = useStores();
      const [searchOptions, setSearchOptions] = useState<SearchOptions[]>();
      const [searchLoader, setSearchLoader] = useState<boolean>(false);

      // gather all options already in the store, leverage the fact
      // that property store is readonly
      const options = useMemo(() => {
        const options: SearchOptions[] = [];
        for (const u of sm.graph.nodes) {
          options.push({
            type: u.nodetype,
            id: u.id,
            value: `${u.nodetype}:${u.id}`,
            label: sm.graph.uriCount.label(u),
            element: undefined,
            className: classes[u.nodetype],
          } as any);
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
        setSearchLoader(true);
        classStore
          .fetchSearchResults(query)
          .then((data) => {
            data.forEach((searchResult: SearchResult) => {
              searchResults.push({
                type: "class",
                id: searchResult.id,
                element: searchResult,
                // label: `${searchResult.label} (${searchResult.id})`,
                label: (
                  <div>
                    <p style={{ color: "blue" }}>
                      {searchResult.label} ({searchResult.id})
                    </p>
                    <p style={{ fontSize: 12, marginTop: -5 }}>
                      {searchResult.description}
                    </p>
                  </div>
                ),
                value: `class:${searchResult.id}`,
              });
            });
            console.log("results");
            console.log(searchResults);
            // setSearchOptions(searchResults);
            return searchResults;
          })
          .then((searchResults) => {
            setSearchOptions([...searchResults, ...options]);
            setSearchLoader(false);
            console.log(searchOptions);
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
          optionFilterProp="elemen.label"
          className={classes.selection}
          showSearch={true}
          // filterSort={(optionA, optionB) =>
          //   (optionA?.element?.label ?? "")
          //     .toLowerCase()
          //     .localeCompare((optionB?.element?.label ?? "").toLowerCase())
          // }
          onSearch={debounce(onSearch, 300)}
          filterOption={false}
          value={value === undefined ? undefined : `${value.type}:${value.id}`}
          onSelect={(value: any, option: SearchOptions) => {
            classStore.fetchById(option.id).then(() => {
              onSelect({ type: option.type, id: option.id });
            });
          }}
          loading={searchLoader}
          onDeselect={(value: any, option: SearchValue) => {
            onDeselect({ type: option.type, id: option.id });
          }}
        />
      );
    }
  )
);
