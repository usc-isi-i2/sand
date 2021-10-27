import ProTable from "@ant-design/pro-table";
import { WithStyles, withStyles } from "@material-ui/styles";
import { Popover } from "antd";
import { observer } from "mobx-react";
import { useMemo } from "react";
import { Table, TableRow, useStores } from "../../models";

const styles = {
  root: {
    marginTop: 8,
    "& div.ant-table-container": {
      border: "1px solid #bbb",
      borderRadius: 4,
      borderLeft: "1px solid #bbb !important",
    },
  },
};

export const TableComponent = withStyles(styles)(
  observer(
    ({ table, classes }: { table: Table } & WithStyles<typeof styles>) => {
      const { tableRowStore } = useStores();
      const columns = useMemo(() => {
        let lst: any = table.columns.map((name, index) => ({
          title: name,
          dataIndex: ["row", index],
          render: (cell: string, record: TableRow) =>
            renderCell(cell, record, index),
        }));
        lst.unshift({ title: "", dataIndex: "index" });
        return lst;
      }, [table.id]);

      return (
        <div className={classes.root}>
          <ProTable
            size="small"
            bordered={true}
            request={async (params, sort, filter) => {
              let result = await tableRowStore.fetchSome({
                limit: params.pageSize!,
                offset: (params.current! - 1) * params.pageSize!,
                conditions: { table: table.id },
              });
              return {
                data: result.records,
                success: true,
                total: result.total,
              };
            }}
            rowKey={"index"}
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
            columns={columns}
          />
        </div>
      );
    }
  )
);

function renderCell(cell: string, record: TableRow, index: number) {
  const links = record.links.get(index) || [];
  let components = links.flatMap((link, index) => {
    let prefix =
      index === 0
        ? cell.substring(0, link.start)
        : cell.substring(links[index - 1].end, link.start);
    let linksurface = cell.substring(link.start, link.end);
    let infix = (
      <a
        key={index}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        dangerouslySetInnerHTML={{
          __html: linksurface.trim() === "" ? "&blank;" : linksurface,
        }}
        style={link.entity === null ? { color: "#aaa" } : {}}
      />
    );
    return [prefix, infix];
  });
  if (links.length === 0) {
    components.push(cell);
  } else {
    components.push(cell.substring(links[links.length - 1].end));
  }

  let content = (
    <div className="popover-table">
      <table className="lightweight-table">
        <thead>
          <tr>
            <th>KG Entity</th>
            <th>Class</th>
          </tr>
        </thead>
        <tbody>
          {links
            .filter((link) => link.entity !== null)
            .map((link) => {
              // let entity = cell.metadata.entities[link.entity!];
              // let action = <EntityComponentExternalOpener
              //   entityURI={entity.uri} open={this.shouldOpenEntityNewPage ? undefined : this.modalViewEntity}
              //   autoHighlight={true} />
              return (
                <tr key={link.entity}>
                  <td>
                    {/* <ExternalLink url={link.url} action={action}> */}
                    {link.url}
                    {/* </ExternalLink> */}
                  </td>
                  {/* <td>
                    <ul>
                      {entity.types.map((type) => {
                        return (
                          <li key={type.uri}>
                            <ExternalLink url={type.uri}>
                              {getIndentIndicator(type.depth)} {type.label}
                            </ExternalLink>
                          </li>
                        );
                      })}
                    </ul>
                  </td> */}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <Popover
        content={content}
        // getPopupContainer={(trigger) => this.container.current!}
      >
        <span>{components}</span>
      </Popover>
    </div>
  );
}
