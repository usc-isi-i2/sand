import ProTable from "@ant-design/pro-table";
import { withStyles, WithStyles } from "@material-ui/styles";
import { Descriptions } from "antd";
import React from "react";
import { ExternalLink } from "rma-baseapp";
import { FetchEntityComponent, InlineEntityComponent } from "../entity";
import { CellComponent } from "./CellComponent";
import * as RTable from "./RelationalTable";
import { tableStyles } from "./styles";

export const styles = {
  table: tableStyles,
};

export const TableComponent = withStyles(styles)(
  ({
    table,
    query,
    classes,
    toolBarRender,
  }: {
    table: RTable.Table;
    query: (limit: number, offset: number) => Promise<RTable.Row[]>;
    toolBarRender?: false;
  } & WithStyles<typeof styles>) => {
    const columns = table.columns.map((col, columnIndex) => ({
      dataIndex: ["row", columnIndex, "value"],
      title: col,
      render: ((value: string, record: RTable.Row) => {
        return (
          <CellComponent cell={value} record={record} index={columnIndex} />
        );
      }) as any,
    }));

    return (
      <React.Fragment>
        <ProTable
          className={classes.table}
          defaultSize="small"
          bordered={true}
          request={async (params, sort, filter) => {
            let records = await query(
              params.pageSize!,
              (params.current! - 1) * params.pageSize!
            );
            return {
              data: records,
              success: true,
              total: table.size,
            };
          }}
          search={false}
          pagination={{
            pageSize: 5,
            pageSizeOptions: [
              "5",
              "10",
              "20",
              "50",
              "100",
              "200",
              "500",
              "1000",
            ],
          }}
          headerTitle={
            table.context.webpage !== undefined ? (
              <ExternalLink href={table.context.webpage} openInNewPage={true}>
                {table.name}
              </ExternalLink>
            ) : (
              table.name
            )
          }
          toolBarRender={toolBarRender}
          rowKey="index"
          columns={columns}
        />
        <TableInformation table={table} />
      </React.Fragment>
    );
  }
);

export const TableInformation: React.FunctionComponent<{
  table: RTable.Table;
}> = ({ table }) => {
  const info: [string, React.ReactNode][] = [
    ["Description", table.description],
  ];

  if (table.context.webpage !== undefined) {
    info.push([
      "From website",
      <ExternalLink href={table.context.webpage} openInNewPage={true}>
        {table.context.title}
      </ExternalLink>,
    ]);
  } else {
    info.push(["From website", "N/A"]);
  }
  info.push([
    "Associated Entity",
    table.context.entityId !== undefined ? (
      <FetchEntityComponent
        entityId={table.context.entityId}
        render={(entity) => <InlineEntityComponent entity={entity} />}
      />
    ) : (
      "N/A"
    ),
  ]);

  let content = (table.context.contentHierarchy || []).map(
    (hierarchy, index) => {
      return (
        <div key={index}>
          <b>
            {"#".repeat(hierarchy.level)} {hierarchy.heading}
          </b>
          <p>{hierarchy.contentBefore}</p>
          <p>{hierarchy.contentAfter}</p>
        </div>
      );
    }
  );
  info.push(["Content Hierarchy", content.length > 0 ? content : "N/A"]);

  return (
    <Descriptions title="Table Info" size="small">
      {info.map(([label, value]) => (
        <Descriptions.Item key={label} label={label}>
          {value}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
};
