import ProTable, { ActionType } from "@ant-design/pro-table";
import { withStyles, WithStyles } from "@material-ui/styles";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { RawTable } from "../../../../models/project";
import { TableComponentFunc } from "../../../table/table/TableComponent";

const styles = {
  table: {
    "& div.ant-table-container": {
      border: "1px solid #bbb",
      borderRadius: 4,
      borderLeft: "1px solid #bbb !important",
    },
    "& div.ant-card-body": {
      paddingLeft: 0,
      paddingRight: 0,
    },
    "& th": {
      fontWeight: 600,
    },
  },
};

export const RawTableComponent = withStyles(styles)(
  forwardRef(
    (
      { table, classes }: { table: RawTable } & WithStyles<typeof styles>,
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

      return (
        <ProTable
          actionRef={actionRef}
          className={classes.table}
          defaultSize="small"
          bordered={true}
          toolBarRender={false}
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
          rowKey="id"
          columns={table.header.map((header, index) => ({
            dataIndex: ["data", index],
            title: header,
          }))}
          request={async (params, sort, filter) => {
            const start = (params.current! - 1) * params.pageSize!;
            const end = start + params.pageSize!;
            return {
              data: table.rows
                .slice(start, end)
                .map((row, index) => ({ data: row, id: index + start })),
              success: true,
              total: table.rows.length,
            };
          }}
        />
      );
    }
  )
);
