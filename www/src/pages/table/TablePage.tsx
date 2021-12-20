import { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import {
  useStores,
  TableStore as TableStoreType,
  TableRow,
  Project,
  Table,
} from "../../models";
import { useLocation, useParams } from "react-router-dom";
import { routes } from "../../routes";
import React from "react";
import { LoadingPage, NotFoundPage, history } from "rma-baseapp";
import { Button, PageHeader, Popover, Space } from "antd";
import ProTable from "@ant-design/pro-table";
import { WithStyles, withStyles } from "@material-ui/styles";
import { useHotkeys } from "react-hotkeys-hook";
import _ from "lodash";
import { toJS } from "mobx";
// import { TableComponent } from "./TableComponent";
import { TableComponent } from "../../components/table";
import * as RTable from "../../components/table/RelationalTable";
import { SemanticGraphComponent } from "./SemanticModelComponent";

// https://cssinjs.org/jss-plugin-nested?v=v10.8.0#use--to-reference-selector-of-the-parent-rule
const styles = {
  table: {
    marginTop: 8,
    "& div.ant-table-container": {
      border: "1px solid #bbb",
      borderRadius: 4,
      borderLeft: "1px solid #bbb !important",
    },
  },
  container: {
    marginLeft: 24,
    marginRight: 24,
  },
};

export const TablePage = withStyles(styles)(
  observer(({ classes }: WithStyles<typeof styles>) => {
    // use stores
    const {
      projectStore,
      tableStore,
      tableRowStore,
      semanticModelStore,
      entityStore,
    } = useStores();
    // define states
    const [invalidID, setInvalidID] = useState(false);

    // parse necessary route parameters
    const tableId = routes.table.useURLParams()!.tableId;
    const { navState, toNextTable, toPreviousTable } = useTableNavigation(
      tableStore,
      tableId
    );

    useEffect(() => {
      // fetch the table
      if (!tableStore.has(tableId)) {
        tableStore.fetch(tableId).then((tbl) => {
          if (tbl === undefined) {
            setInvalidID(true);
            return;
          }
          projectStore.fetchIfMissing(tbl.project);
        });
      }

      // fetch its semantic model
      if (!semanticModelStore.hasByTable(tableId)) {
        semanticModelStore.fetchSome({
          limit: 1000,
          offset: 0,
          conditions: {
            table: tableId,
          },
        });
      }
    }, [tableId]);

    useHotkeys("b", toPreviousTable, [navState.version]);
    useHotkeys("n", toNextTable, [navState.version]);

    const table = tableStore.get(tableId);
    const rtable: RTable.Table | undefined = useMemo(() => {
      const table = tableStore.get(tableId);
      if (table === undefined) {
        return undefined;
      }

      return {
        name: table.name,
        description: table.description,
        columns: table.columns,
        size: table.size,
        context: {
          webpage: table.contextPage?.url,
          title: table.contextPage?.title,
          entityId: table.contextPage?.entityId,
          contentHierarchy: table.contextTree,
        },
      };
    }, [tableId, table !== undefined]);

    if (table === undefined) {
      if (invalidID) return <NotFoundPage />;
      return <LoadingPage />;
    }
    let semComponent = null;
    if (!semanticModelStore.hasByTable(tableId)) {
      semComponent = <LoadingPage bordered={true} />;
    } else {
      const sms = semanticModelStore.findByTable(tableId);
      semComponent = <SemanticGraphComponent sm={sms[0]} />;
    }

    const queryRow = async (limit: number, offset: number) => {
      let result = await tableRowStore.fetchSome({
        limit,
        offset,
        conditions: { table: table.id },
      });
      return result.records.map((row) => ({
        index: row.index,
        row: row.row.map((v) => ({ value: v })),
        links: row.links,
      }));
    };

    return (
      <React.Fragment>
        <TableNavBar
          project={projectStore.get(table.project)}
          table={table}
          btns={[
            <Button
              key="prev"
              onClick={toPreviousTable}
              disabled={!navState.hasPrev}
            >
              Previous Table (B)
            </Button>,
            <Button
              key="next"
              onClick={toNextTable}
              disabled={!navState.hasNext}
            >
              Next Table (N)
            </Button>,
          ]}
          extraSubTitle={
            <span className="ml-2">
              Position:{" "}
              <b>
                {" "}
                {navState.leftOffset + navState.tableIndex + 1}/{navState.total}
              </b>
            </span>
          }
        />
        <div className={classes.container}>
          <Space direction="vertical" size={8}>
            {semComponent}
            <TableComponent
              key={tableId}
              toolBarRender={false}
              table={rtable!}
              query={queryRow}
            />
          </Space>
        </div>
      </React.Fragment>
    );
  })
);

function useTableNavigation(TableStore: TableStoreType, tableId: number) {
  const PREFETCH_LIMIT = 50;
  const location = useLocation();
  const queryParams = routes.table.useQueryParams();
  const b64query = queryParams === null ? "" : queryParams.query;
  const tableQueryConditions = useMemo(
    () => (b64query !== "" ? TableStore.decodeWhereQuery(b64query) : {}),
    [b64query]
  );

  // Note: assume that the list is always sorted by id (which the order which the table)
  // is inserted into the DB
  const [state, setState] = useState({
    tableId: -1,
    tableIndex: -1,
    query: "",
    records: [] as number[],
    leftOffset: 0,
    total: 0,
    hasPrev: false,
    hasNext: false,
    allLeft: false,
    allRight: false,
    version: 0,
  });

  useEffect(() => {
    const fn = async () => {
      // we reinit the state whenever the query change, or table id is moved
      // too far from the list (e.g., when users modify the URL)
      const idx = _.sortedIndex(state.records, tableId);
      const reinit = state.query !== b64query || state.records[idx] !== tableId;
      let newState: Partial<typeof state>;

      if (reinit) {
        const [gtr, ltr] = await Promise.all([
          TableStore.query({
            limit: PREFETCH_LIMIT,
            offset: 0,
            fields: ["id"],
            conditions: {
              ...tableQueryConditions,
              id: { op: "gte", value: tableId },
            },
          }),
          TableStore.query({
            limit: PREFETCH_LIMIT,
            offset: 0,
            fields: ["id"],
            conditions: {
              ...tableQueryConditions,
              id: { op: "lt", value: tableId },
            },
          }),
        ]);

        const records = ltr.records
          .map((tbl) => tbl.id)
          .concat(gtr.records.map((tbl) => tbl.id));
        newState = {
          tableIndex: ltr.records.length,
          records,
          total: ltr.total + gtr.total,
          leftOffset: ltr.total - ltr.records.length,
          allLeft: ltr.total <= PREFETCH_LIMIT,
          allRight: gtr.total <= PREFETCH_LIMIT,
          hasPrev: ltr.records.length > 0,
          hasNext: gtr.records.length > 1,
        };
      } else {
        // only table id change, we fetch if it's near the boundary
        if (idx === 0 && !state.allLeft) {
          const ltr = await TableStore.query({
            limit: PREFETCH_LIMIT,
            offset: 0,
            fields: ["id"],
            conditions: {
              ...tableQueryConditions,
              id: { op: "lt", value: tableId },
            },
          });
          newState = {
            tableIndex: ltr.records.length,
            leftOffset: ltr.total - ltr.records.length,
            records: ltr.records.map((tbl) => tbl.id).concat(state.records),
            allLeft: ltr.total <= PREFETCH_LIMIT,
            hasPrev: ltr.records.length > 0,
          };
        } else if (idx === state.records.length - 1 && !state.allRight) {
          const gtr = await TableStore.query({
            limit: PREFETCH_LIMIT,
            offset: 0,
            fields: ["id"],
            conditions: {
              ...tableQueryConditions,
              id: { op: "gt", value: tableId },
            },
          });
          newState = {
            tableIndex: idx,
            records: state.records.concat(gtr.records.map((tbl) => tbl.id)),
            allRight: gtr.total <= PREFETCH_LIMIT,
            hasNext: gtr.records.length > 0,
          };
        } else {
          newState = {
            tableIndex: idx,
            hasNext: idx < state.records.length - 1,
            hasPrev: idx > 0,
          };
        }
      }
      setState({
        ...state,
        ...newState,
        version: state.version + 1,
        query: b64query,
        tableId,
      });
    };
    fn();
  }, [tableId, b64query]);

  // open another table relative to the current table by some offset
  const move = (offset: number) => {
    if (tableId !== state.tableId) {
      // they call the function too fast before the state is updated
      return;
    }

    const nextTableId = state.records[state.tableIndex + offset];
    if (nextTableId !== undefined) {
      routes.table.path({ tableId: nextTableId }, { query: b64query }).open();
    }
  };

  return {
    // get id of the table relative to the current table by some offset
    toPreviousTable: () => {
      move(-1);
    },
    toNextTable: () => {
      move(1);
    },
    navState: state,
  };
}

const TableNavBar = (props: {
  project?: Project;
  table: Table;
  btns?: React.ReactNode[];
  extraSubTitle?: React.ReactNode;
}) => {
  let project = props.project || new Project(0, "", "");
  return (
    <PageHeader
      onBack={() =>
        history.push(
          routes.project.getURL({
            projectId: props.table.project,
          })
        )
      }
      title={
        <Space>
          <span style={{ fontWeight: 500 }}>Table </span>
          <span style={{ color: "#237804", textDecoration: "underline" }}>
            {props.table.name}
          </span>
        </Space>
      }
      subTitle={
        <Space>
          <span>
            (Project <b>{project.name}</b>)
          </span>
          {props.extraSubTitle}
        </Space>
      }
      extra={props.btns}
    />
  );
};
