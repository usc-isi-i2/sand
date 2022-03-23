import { Menu, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { Table, useStores } from "../../models";
import { Class } from "../../models/ontology/ClassStore";
import { TypeTreeFilter } from "./table/filters";
import { ColumnFilter } from "./table/filters/Filter";

export const TableColumnFilter = ({
  table,
  columnIndex,
  filter,
}: {
  table: Table;
  columnIndex: number;
  filter: ColumnFilter;
}) => {
  const [menu, setMenu] = useState("by-type");
  const { assistantService, semanticModelStore, classStore } = useStores();
  const [types, setTypes] = useState<{ [id: string]: Class }>({});
  const [typeCfg, setTypeCfg] = useState({
    includeNil: false,
    includeUnlinked: false,
  });

  useEffect(() => {
    if (menu !== "by-type") {
      return;
    }
    assistantService.getColumnTypes(table, columnIndex, false).then(setTypes);
  }, [menu]);

  let component = null;
  if (menu === "by-type") {
    component = (
      <TypeTreeFilter
        key={`${table.id} ${columnIndex}`}
        types={types}
        filter={filter}
      />
    );
  }

  return (
    <div style={{ minWidth: 300, padding: 8 }}>
      {/* <Menu
        mode="horizontal"
        selectedKeys={[menu]}
        onClick={(e) => setMenu(e.key)}
        style={{ minWidth: 300 }}
      >
        <Menu.Item key="by-type">Filter By Type</Menu.Item>
        <Menu.Item key="by-prop">Filter By Property</Menu.Item>
      </Menu> */}
      <Space style={{ width: "100%" }} direction="vertical">
        <Typography.Text strong={true}>Filter By Type</Typography.Text>
        {component}
      </Space>
    </div>
  );
};
