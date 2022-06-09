import { WithStyles, withStyles } from "@material-ui/styles";
import { Tabs } from "antd";
import { useEffect, useState } from "react";
import { Property, Table, useStores } from "../../../models";
import { Class } from "../../../models/ontology/ClassStore";
import { TypeTreeFilter } from "./filters";
import { ColumnFilter } from "./filters/Filter";
import { PropTreeFilter } from "./filters/PropTreeFilter";

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
    const [menu, _setMenu] = useState("by-type");
    const { assistantService } = useStores();
    const [types, setTypes] = useState<{ [id: string]: Class }>({});
    const [props, _setProps] = useState<{ [id: string]: Property }>({});
    const [_typeCfg, _setTypeCfg] = useState({
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
