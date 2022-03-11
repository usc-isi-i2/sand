import ProTable, { ActionType } from "@ant-design/pro-table";
import { withStyles, WithStyles } from "@material-ui/styles";
import { Descriptions, Typography } from "antd";
import { toJS } from "mobx";
import React, { useRef, forwardRef, useImperativeHandle } from "react";
import { ExternalLink } from "rma-baseapp";
import { isLineBreak, LineBreak, Text } from "../../models/table/TableContext";
import {
  FetchEntityComponent,
  InlineEntityComponent,
  openPageEntityComponent,
  PopoverEntityComponent,
} from "../entity";
import { CellComponent } from "./CellComponent";
import * as RTable from "./RelationalTable";
import { tableStyles } from "./styles";

export const styles = {
  table: tableStyles,
};

export interface TableComponentFunc {
  reload: () => void;
}

export const TableComponent = withStyles(styles)(
  forwardRef(
    (
      {
        table,
        query,
        classes,
        toolBarRender,
        showRowIndex = false,
      }: {
        table: RTable.Table;
        query: (limit: number, offset: number) => Promise<RTable.Row[]>;
        toolBarRender?: false;
        showRowIndex?: boolean;
      } & WithStyles<typeof styles>,
      ref
    ) => {
      const actionRef = useRef<ActionType>();
      useImperativeHandle(
        ref,
        (): TableComponentFunc => ({
          reload: () => {
            actionRef.current?.reload();
          },
        })
      );

      const columns = table.columns.map((col, columnIndex) => ({
        dataIndex: ["row", columnIndex, "value"],
        title: col,
        render: ((value: string, record: RTable.Row) => {
          return (
            <CellComponent cell={value} record={record} index={columnIndex} />
          );
        }) as any,
      }));

      if (showRowIndex) {
        columns.splice(0, 0, {
          title: (
            <Typography.Text type="secondary" disabled={true}>
              #
            </Typography.Text>
          ),
          dataIndex: "index",
        } as any);
      }

      return (
        <>
          <ProTable
            actionRef={actionRef}
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
        </>
      );
    }
  )
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
        render={(entity, settings) => (
          <PopoverEntityComponent
            entity={entity}
            zIndex={500}
            settings={settings}
          >
            <InlineEntityComponent
              entity={entity}
              onCtrlClick={() => {
                openPageEntityComponent({ entity, settings });
              }}
            />
          </PopoverEntityComponent>
        )}
        renderNotFound={() => (
          <span>`Entity ${table.context.entityId} does not exist`</span>
        )}
      />
    ) : (
      "N/A"
    ),
  ]);

  let content = (table.context.contentHierarchy || []).flatMap(
    (hierarchy, index) => {
      if (hierarchy.level === 0 && hierarchy.heading.trim().length === 0) {
        if (
          hierarchy.contentBefore.every(isLineBreak) &&
          hierarchy.contentAfter.length === 0
        ) {
          return [];
        }
      }
      const output = [
        <p key={`${index}-head`}>
          <b>
            {"#".repeat(hierarchy.level)} {hierarchy.heading}
          </b>
        </p>,
      ];
      return output
        .concat(ContentComponent(`${index}-before`, hierarchy.contentBefore))
        .concat(ContentComponent(`${index}-after`, hierarchy.contentAfter));
    }
  );
  info.push([
    "Content Hierarchy",
    content.length > 0 ? <div>{content}</div> : "N/A",
  ]);

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

const ContentComponent = (key: string, lines: (Text | LineBreak)[]) => {
  const comps: string[][] = [[]];
  for (const line of lines) {
    if (isLineBreak(line)) {
      comps.push([]);
    } else {
      comps[comps.length - 1].push(line.value);
    }
  }
  return comps
    .filter((lst) => lst.length > 0)
    .map((lst, i) => <p key={`${key}-${i}`}>{lst}</p>);
};
