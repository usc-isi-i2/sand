import { WithStyles, withStyles } from "@material-ui/styles";
import { Button, PageHeader, Space } from "antd";
import _ from "lodash";
import { observer } from "mobx-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { history, LoadingComponent, NotFoundComponent } from "gena-app";
import { AutoHideTooltip } from "../../components/element";
import {
  DraftSemanticModel,
  Project,
  Table,
  TableStore as TableStoreType,
  useStores,
} from "../../models";
import { routes } from "../../routes";
import { EntitySettingComponent } from "./EntitySettingComponent";
import { MenuBar } from "./MenuBar";
import {
  SemanticModelComponent,
  SemanticModelComponentFunc,
} from "./SemanticModelComponent";
import { TableComponent } from "./table";
import { TableFilter } from "./table/filters/Filter";
import { TableComponentFunc } from "./table/TableComponent";
import { TableNavBar } from "./TableNavBar";

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
      assistantService,
      classStore,
      entityStore,
    } = useStores();
    // parse necessary route parameters
    const tableId = routes.table.useURLParams()!.tableId;
    const { sms, index, setIndex } = useSemanticModel(tableId);

    const tableRef = useRef<TableComponentFunc>(null);
    const graphRef = useRef<SemanticModelComponentFunc>(null);

    useEffect(() => {
      // fetch the table
      tableStore.fetchById(tableId).then((table) => {
        if (table !== undefined) {
          projectStore.fetchById(table.project);
        }
      });
    }, [tableStore, projectStore, semanticModelStore, tableId]);

    const table = tableStore.get(tableId);

    if (table === null) {
      return <NotFoundComponent />;
    } else if (table === undefined || sms.length === 0) {
      // the table and sms is loading
      return <LoadingComponent />;
    }

    return (
      <React.Fragment>
        <TableNavBar project={projectStore.get(table.project)} table={table} />
        <div className={classes.container}>
          <Space direction="vertical" size={8}>
            <MenuBar
              graphRef={graphRef}
              tableRef={tableRef}
              table={table}
              semanticmodel={{ sms, index, setIndex }}
            />
            <SemanticModelComponent
              ref={graphRef}
              key={`sm-${tableId}`}
              table={table}
              sm={sms[index]}
            />
            <TableComponent
              ref={tableRef}
              key={`tbl-${tableId}`}
              toolBarRender={false}
              table={table}
              query={async (
                limit: number,
                offset: number,
                filter: TableFilter
              ) => {
                if (!filter.hasFilter()) {
                  const rows = await tableRowStore.fetchByTable(
                    table,
                    offset,
                    limit
                  );
                  return { rows, total: table.size };
                }

                const allrows = await tableRowStore.fetchByTable(
                  table,
                  0,
                  table.size
                );
                const rows = await filter.filter(
                  allrows,
                  entityStore,
                  classStore
                );
                return {
                  rows: rows.slice(offset, offset + limit),
                  total: rows.length,
                };
              }}
              showRowIndex={true}
            />
            <EntitySettingComponent />
          </Space>
        </div>
      </React.Fragment>
    );
  })
);

function useSemanticModel(tableId: number) {
  const { tableStore, semanticModelStore } = useStores();
  const [prevTableId, setPrevTableId] = useState(-1);
  const [hasFetchSemanticModel, setHasFetchSemanticModel] = useState(false);
  const [index, setIndex] = useState(0);
  const isUpdatedState = prevTableId === -1 || tableId === prevTableId;

  if (tableId !== prevTableId) {
    // reset the internal state
    setPrevTableId(tableId);
    setHasFetchSemanticModel(false);
    setIndex(0);
  }

  useEffect(() => {
    let mounted = true;
    if (!semanticModelStore.hasByTable(tableId)) {
      semanticModelStore
        .fetch({
          limit: 1000,
          offset: 0,
          conditions: {
            table: tableId,
          },
        })
        .then(() => {
          if (mounted) {
            setHasFetchSemanticModel(true);
          }
        });
    }
    return () => {
      mounted = false;
    };
  }, [semanticModelStore, tableId]);

  const table = tableStore.get(tableId);

  if (
    !isUpdatedState ||
    table === undefined ||
    table === null ||
    (!semanticModelStore.hasByTable(tableId) && !hasFetchSemanticModel)
  ) {
    // either the table does not exist, the internal state is not updated, or the semantic model is not fetched
    return { index, sms: [], setIndex };
  }

  const sms = semanticModelStore.findByTable(tableId);
  const drafts = semanticModelStore.getCreateDraftsByTable(table);

  if (index >= sms.length + drafts.length) {
    // there is no semantic model & no draft for this table, create a new draft
    const id = semanticModelStore.getNewCreateDraftId(table);
    const draft = DraftSemanticModel.getDefaultDraftSemanticModel(
      id,
      `sm-${sms.length}`,
      table
    );
    semanticModelStore.setCreateDraft(draft);
    drafts.push(draft);
  }

  const sm = index < sms.length ? sms[index] : drafts[index - sms.length];

  return { sms: sms.concat(drafts), index, setIndex };
}
