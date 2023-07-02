import { gold, green, purple } from "@ant-design/colors";
import { WithStyles, withStyles } from "@material-ui/styles";
import { Select, Spin } from "antd";
import { observer } from "mobx-react";
import { useMemo, useState } from "react";
import { ClassTextSearchResult } from "../../models/ontology/ClassStore";
import { SemanticModel, useStores } from "../../models";
import { SMNodeType } from "../../models/sm";
import { debounce } from "lodash";
import SearchOptionsComponent from "./SearchOptionsComponent";

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
  type?: SMNodeType | "class";
  className?: string;
}

export type SearchValue = { type?: SMNodeType | "class"; id: string };

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

      // gather all options already in the store, leverage the fact
      // that property store is readonly
      const options = useMemo(() => {
        const options: SearchOptions[] = [];

        for (const u of sm.graph.nodes) {
          if (
            classSearchOnly &&
            !(u.nodetype == "class_node" || u.nodetype == "literal_node")
          )
            continue;
          options.push({
            type: u.nodetype,
            id: u.id,
            value: `${u.nodetype}:${u.id}`,
            label: sm.graph.uriCount.label(u),
            filterlabel: sm.graph.uriCount.label(u),
            className: classes[u.nodetype],
          });
        }

        setSearchOptions(options);
        console.log(options);
        return options;
      }, [sm.graph.version]);

      // search for additional values if it's not in the list
      const onSearch = (query: string) => {
        if (query === "") {
          setSearchOptions(options);
          return;
        }
        const loaderOption: SearchOptions = {
          type: "class",
          id: "",
          label: <Spin style={{ width: "100%", marginTop: 3 }} size="large" />,
          filterlabel: query,
          value: "",
          className: "",
        };

        console.log(options);
        setSearchOptions([...options, loaderOption]);

        classStore.findByName(query).then((data) => {
          let searchResults: SearchOptions[] = data.map(
            (searchResult: ClassTextSearchResult) => {
              return {
                type: "class",
                id: searchResult.id,
                label: (
                  <SearchOptionsComponent
                    id={searchResult.id}
                    description={searchResult.description}
                    label={searchResult.label}
                  />
                ),
                filterlabel: `${searchResult.label} (${searchResult.id})`,
                value: `class:${searchResult.id}`,
              };
            }
          );
          setSearchOptions([...options, ...searchResults]);
        });
      };

      return (
        <Select
          allowClear={true}
          options={searchOptions}
          onClear={() => setSearchOptions(options)}
          optionFilterProp="filterlabel"
          defaultActiveFirstOption={false}
          className={classes.selection}
          showSearch={true}
          filterOption={(inputValue, option) => {
            if (option!.type != "class") {
              let label = option?.filterlabel!;
              let inputTokensFilter = inputValue
                .split(" ")
                .map((value) => {
                  return label.toLowerCase().indexOf(value.toLowerCase());
                })
                .filter((value) => value! < 0);

              if (inputTokensFilter.length > 0) {
                return false;
              } else {
                return true;
              }
            } else {
              return true;
            }
          }}
          onSearch={debounce(onSearch, 300)}
          value={value === undefined ? undefined : `${value.type}:${value.id}`}
          onSelect={(value: any, option: SearchOptions) => {
            if (option.type == "class") {
              classStore.fetchById(option.id).then(() => {
                onSelect({ type: option.type, id: option.id });
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
