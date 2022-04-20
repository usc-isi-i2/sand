import { Menu, Space, Tabs, Typography } from "antd";
import { WithStyles, withStyles } from "@material-ui/styles";
import { useEffect, useState } from "react";
import { Property, Table, useStores } from "../../models";
import { Class } from "../../models/ontology/ClassStore";
import { TypeTreeFilter } from "./table/filters";
import { ColumnFilter } from "./table/filters/Filter";
import { PropTreeFilter } from "./table/filters/PropTreeFilter";

const styles = {
  tab: {
    "& div.ant-tabs-nav": {
      marginBottom: "8px !important",
    },
  },
};

export const TableColumnFilter = withStyles(styles)(
  ({
    table,
    columnIndex,
    filter,
    classes,
  }: {
    table: Table;
    columnIndex: number;
    filter: ColumnFilter;
  } & WithStyles<typeof styles>) => {
    const [menu, setMenu] = useState("by-type");
    const { assistantService, semanticModelStore, classStore } = useStores();
    const [types, setTypes] = useState<{ [id: string]: Class }>({});
    const [props, setProps] = useState<{ [id: string]: Property }>({});
    const [typeCfg, setTypeCfg] = useState({
      includeNil: false,
      includeUnlinked: false,
    });

    useEffect(() => {
      assistantService.getColumnTypes(table, columnIndex, false).then(setTypes);
      // assistantService
      //   .getColumnProperties(table, columnIndex, false)
      //   .then(setProps);
    }, [menu]);

    return (
      <div style={{ minWidth: 495, padding: 8 }}>
        <Tabs className={classes.tab} defaultActiveKey="by-type" size={"small"}>
          <Tabs.TabPane tab="Filter By Type" key="by-type">
            <TypeTreeFilter
              key={`${table.id} ${columnIndex}`}
              types={types}
              filter={filter}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Filter By Property" key="by-prop">
            <PropTreeFilter
              key={`${table.id} ${columnIndex}`}
              properties={props}
              filter={filter}
            />
          </Tabs.TabPane>
        </Tabs>
      </div>
    );
  }
);
