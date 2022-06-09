import { SearchOutlined } from "@ant-design/icons";
import ProTable, { ActionType } from "@ant-design/pro-table";
import { withStyles, WithStyles } from "@material-ui/styles";
import { Descriptions, Tag, Typography } from "antd";
import { ExternalLink } from "gena-app";
import { observer } from "mobx-react";
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  FetchEntityComponent,
  InlineEntityComponent,
  openPageEntityComponent,
  PopoverEntityComponent,
} from "../../../components/entity";
import { DataType } from "../../../models";
import { Table, TableRow } from "../../../models/table";
import {
  isLineBreak,
  LineBreak,
  Text,
} from "../../../models/table/TableContext";
import { CellComponent } from "./CellComponent";
import { TableFilter } from "./filters/Filter";
import { tableStyles } from "./styles";
import { TableColumnFilter } from "./TableColumn";

export const styles = {
  table: tableStyles,
};

export interface TableComponentFunc {
  reload: () => void;
}

export const TableComponent = withStyles(styles)(
  observer(
    forwardRef(
      (
        {
          table,
          query,
          classes,
          toolBarRender,
          showRowIndex = false,
          column2datatype,
        }: {
          table: Table;
          query: (
            limit: number,
            offset: number,
            filter: TableFilter
          ) => Promise<{ rows: TableRow[]; total: number }>;
          toolBarRender?: false;
          showRowIndex?: boolean;
          column2datatype: (DataType[] | undefined)[];
        } & WithStyles<typeof styles>,
        ref
      ) => {
        const actionRef = useRef<ActionType>();
        const [filter, _setFilter] = useState(
          new TableFilter(table.columns.length, (filter: TableFilter) => {
            // reload the table and reset the page index cause we update the filter
            // another reason is some how without resetting the page index, protable triggers the request
            // function twice
            actionRef.current?.reload(true);
          })
        );

        useImperativeHandle(
          ref,
          (): TableComponentFunc => ({
            reload: () => {
              actionRef.current?.reload();
            },
          })
        );

        const columns = table.columns.map((col, columnIndex) => ({
          dataIndex: ["row", columnIndex],
          title: () => {
            const dtypes = column2datatype[columnIndex];
            if (
              dtypes === undefined ||
              (dtypes.length === 1 && dtypes[0] === "unknown")
            ) {
              // no datatype
              return table.columns[columnIndex];
            }

            return (
              <>
                <div>{table.columns[columnIndex]}</div>
                <div className="column-datatype">
                  {dtypes.map((datatype) => (
                    <Tag key={datatype} color="green">
                      {datatype}
                    </Tag>
                  ))}
                </div>
              </>
            );
          },
          render: ((value: string, record: TableRow) => {
            return (
              <CellComponent cell={value} record={record} index={columnIndex} />
            );
          }) as any,
          filterDropdown: (
            <TableColumnFilter
              table={table}
              columnIndex={columnIndex}
              filter={filter.columnFilters[columnIndex]}
            />
          ),
          filterIcon: (
            <SearchOutlined
              style={{
                color: filter.columnFilters[columnIndex].hasFilter
                  ? "#1890ff"
                  : undefined,
              }}
            />
          ),
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
              params={{ filter }}
              request={async (params, sort, filter) => {
                const { rows, total } = await query(
                  params.pageSize!,
                  (params.current! - 1) * params.pageSize!,
                  params.filter
                );
                return {
                  data: rows,
                  success: true,
                  total,
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
                table.contextPage.url !== undefined ? (
                  <ExternalLink
                    href={table.contextPage.url}
                    openInNewPage={true}
                  >
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
  )
);

export const TableInformation: React.FunctionComponent<{
  table: Table;
}> = ({ table }) => {
  const info: [string, React.ReactNode][] = [
    ["Description", table.description],
  ];

  if (table.contextPage.url !== undefined) {
    info.push([
      "From website",
      <ExternalLink href={table.contextPage.url} openInNewPage={true}>
        {table.contextPage.title}
      </ExternalLink>,
    ]);
  } else {
    info.push(["From website", "N/A"]);
  }
  info.push([
    "Associated Entity",
    table.contextPage.entityId !== undefined ? (
      <FetchEntityComponent
        entityId={table.contextPage.entityId}
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
          <span>`Entity ${table.contextPage.entityId} does not exist`</span>
        )}
      />
    ) : (
      "N/A"
    ),
  ]);

  let content = (table.contextHierarchy || []).flatMap((hierarchy, index) => {
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
  });
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
