import { Button, PageHeader, Space } from "antd";
import { useEffect, useMemo, useState } from "react";
import { AutoHideTooltip } from "../../components";
import { Table, Project, useStores } from "../../models";
import { routes } from "../../routes";
import _ from "lodash";
import { history } from "gena-app";
import { useHotkeys } from "react-hotkeys-hook";

function useTableNavigation(tableId: number) {
  const { tableStore } = useStores();
  const PREFETCH_LIMIT = 50;
  const queryParams = routes.table.useQueryParams();
  const b64query = queryParams === null ? "" : queryParams.query;
  const tableQueryConditions = useMemo(
    () => (b64query !== "" ? tableStore.decodeWhereQuery(b64query) : {}),
    [tableStore, b64query]
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
    let isMounted = true;

    const fn = async () => {
      // we reinit the state whenever the query change, or table id is moved
      // too far from the list (e.g., when users modify the URL)
      const idx = _.sortedIndex(state.records, tableId);
      const reinit = state.query !== b64query || state.records[idx] !== tableId;
      let newState: Partial<typeof state>;

      if (reinit) {
        const [gtr, ltr] = await Promise.all([
          tableStore.query({
            limit: PREFETCH_LIMIT,
            offset: 0,
            fields: ["id"],
            conditions: {
              ...tableQueryConditions,
              id: { op: "gte", value: tableId },
            },
          }),
          tableStore.query({
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
          const ltr = await tableStore.query({
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
          const gtr = await tableStore.query({
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

      if (isMounted) {
        setState({
          ...state,
          ...newState,
          version: state.version + 1,
          query: b64query,
          tableId,
        });
      }
    };

    fn();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

export const TableNavBar = (props: {
  project: Project | null | undefined;
  table: Table;
  btns?: React.ReactNode[];
  extraSubTitle?: React.ReactNode;
}) => {
  let project = props.project || new Project(0, "", "");
  const { navState, toNextTable, toPreviousTable } = useTableNavigation(
    props.table.id
  );

  useHotkeys("b", toPreviousTable, [props.table.id, navState.version]);
  useHotkeys("n", toNextTable, [props.table.id, navState.version]);

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
        <Space key="title">
          <span style={{ fontWeight: 500 }}>Table </span>
          <AutoHideTooltip title="copied" ms={500}>
            <span
              style={{
                color: "#237804",
                textDecoration: "underline",
                cursor: "pointer",
              }}
              onClick={() => navigator.clipboard.writeText(props.table.name)}
            >
              {props.table.name}
            </span>
          </AutoHideTooltip>
        </Space>
      }
      subTitle={
        <Space key="sub-title">
          <span>
            (Project <b>{project.name}</b>)
          </span>
          <span className="ml-2">
            Position:{" "}
            <b>
              {" "}
              {navState.leftOffset + navState.tableIndex + 1}/{navState.total}
            </b>
          </span>
        </Space>
      }
      extra={[
        <Button
          key="prev"
          onClick={toPreviousTable}
          disabled={!navState.hasPrev}
        >
          Previous Table (B)
        </Button>,
        <Button key="next" onClick={toNextTable} disabled={!navState.hasNext}>
          Next Table (N)
        </Button>,
      ]}
    />
  );
};
