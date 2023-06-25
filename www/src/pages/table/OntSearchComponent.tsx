import { WithStyles, withStyles } from "@material-ui/styles";
import { Select, Spin } from "antd";
import { observer } from "mobx-react";
import { useEffect, useMemo, useState } from "react";
import { useStores } from "../../models";
import LabelComponent from "../../components/search/LabelComponent";
import { debounce } from "lodash";
import { SearchOptions } from "./NodeSearchComponent";
import { ClassTextSearchResult } from "../../models/ontology/ClassStore";
import { PropertyTextSearchResult } from "../../models/ontology/PropertyStore";
import { EntityTextSearchResult } from "../../models/entity/EntityStore";

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
  const [searchOptions, setSearchOptions] = useState<SearchOptions[]>();

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
    const options: SearchOptions[] = [];
    for (const r of store.iter()) {
      options.push({
        value: r.id ,
        label: r.readableLabel,

      } as any);

    }
    setSearchOptions([...options]);
    return options;
  }, [store.records.size]);

  const loaderOption: SearchOptions = {
    type: "class",
    id: "",
    label: (
      <Spin style={{ width: "100%" }} size="large" />
    ),
    filterlabel: ``,
    value: ``,
  };

  const onSearch = (query: string) => {
    if (query === "") {
      setSearchOptions([...options]);
      return;
    }
    const searchResults: SearchOptions[] = [];
    loaderOption.filterlabel = query;

    setSearchOptions([...options, loaderOption]);
    if(storeName === 'classStore') {
      store
      .fetchSearchResults(query)
      .then((data) => {
        data.forEach((searchResult: ClassTextSearchResult) => {
          searchResults.push({
            type: "class",
            id: searchResult.id,
            label: (
              <LabelComponent id={searchResult.id} description={searchResult.description}
               label={searchResult.label} />

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

    } else if(storeName === 'propertyStore') {
      store
      .fetchSearchResults(query)
      .then((data) => {
        data.forEach((searchResult: PropertyTextSearchResult) => {
          searchResults.push({
            id: searchResult.id,
            label: (
              <LabelComponent id={searchResult.id} label={searchResult.label}
               description={searchResult.description} />
            ),
            filterlabel: `${searchResult.label} (${searchResult.id})`,
            value: `property:${searchResult.id}`,
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

    } else {
      store
      .fetchSearchResults(query)
      .then((data) => {
        data.forEach((searchResult: EntityTextSearchResult) => {
          searchResults.push({
            id: searchResult.id,
            label: (
              <LabelComponent id={searchResult.id} label={searchResult.label}
               description={searchResult.description} />
            ),
            filterlabel: `${searchResult.label} (${searchResult.id})`,
            value: `entity:${searchResult.id}`,
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

    }



  } 


  return (
    <Select
      allowClear={true}
      options={searchOptions}
      onClear={() => setSearchOptions([...options])}
      optionFilterProp="filterlabel"
      defaultActiveFirstOption={false}
      className={props.classes.selection}
      showSearch={true}
      onSearch={debounce(onSearch, 300)}
      value={props.value === undefined ? undefined : `${props.value}`}
      onSelect={(value: any, option: SearchOptions) => {
          store.fetchById(option.id).then(() => {
            if(props !== undefined) {
              props.onSelect?.(option.id)
            } 
          });
      }}
      onDeselect={(value: any, option: SearchOptions) => {
        props.onDeselect?.(option.id)
      }}
    />
  );
}
