import {
  DeleteOutlined,
  DownOutlined,
  ExportOutlined,
  FileAddOutlined,
  ImportOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  faFloppyDisk,
  faRectangleList,
} from "@fortawesome/free-regular-svg-icons";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Dropdown, Menu, Popconfirm, Space, Tag } from "antd";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  DraftSemanticModel,
  SemanticModel,
  Table,
  useStores,
} from "../../models";
import { routes } from "../../routes";
import { openForm } from "./forms";
import { SemanticModelComponentFunc } from "./SemanticModelComponent";
import { TableComponentFunc } from "./table/TableComponent";

export const MenuBar = observer(
  ({
    tableRef,
    graphRef,
    table,
    semanticmodel,
  }: {
    table: Table;
    semanticmodel: {
      sms: SemanticModel[];
      index: number;
      setIndex: (index: number) => void;
    };
    tableRef: React.MutableRefObject<TableComponentFunc | null>;
    graphRef: React.MutableRefObject<SemanticModelComponentFunc | null>;
  }) => {
    const [menuVisible, setMenuVisible] = useState(false);
    const { semanticModelStore, assistantService, uiSettings } = useStores();

    useHotkeys(
      "c",
      graphRef.current === null ? () => {} : graphRef.current.recenter,
      [graphRef.current, smUniqueIdent(semanticmodel.sms[semanticmodel.index])]
    );

    {
      const lstSmsKey = semanticmodel.sms.map(smUniqueIdent).join("---");
      useHotkeys(
        "shift+n",
        () => {
          if (semanticmodel.index < semanticmodel.sms.length - 1) {
            semanticmodel.setIndex(semanticmodel.index + 1);
          }
        },
        [table.id, semanticmodel.index, lstSmsKey]
      );
      useHotkeys(
        "shift+b",
        () => {
          if (semanticmodel.index > 0) {
            semanticmodel.setIndex(semanticmodel.index - 1);
          }
        },
        [table.id, semanticmodel.index, lstSmsKey]
      );
    }

    const sm = semanticmodel.sms[semanticmodel.index];

    const funcs = {
      saveModel: () => {
        if (SemanticModel.isDraft(sm)) {
          semanticModelStore.create(sm);
        } else if (sm.graph.stale) {
          semanticModelStore.update(sm);
        }
      },
      addModel: () => {
        const id = semanticModelStore.getNewCreateDraftId(table);
        const nSms = semanticmodel.sms.length;
        const draft = DraftSemanticModel.getDefaultDraftSemanticModel(
          id,
          semanticModelStore.getNewSemanticModelName(table),
          table
        );
        draft.graph = sm.graph.clone();
        draft.graph.id = id;
        semanticModelStore.setCreateDraft(draft);
        semanticmodel.setIndex(nSms);
      },
      deleteModel: () => {
        if (SemanticModel.isDraft(sm)) {
          semanticModelStore.deleteCreateDraft(sm.draftID);
        } else {
          semanticModelStore.delete(sm.id);
        }
        semanticmodel.setIndex(0);
        setMenuVisible(false);
      },
      exportModel: () => {
        routes.tableExportModel
          .path({ tableId: table.id }, { attachment: false })
          .mouseClickNavigationHandler(undefined, true);
      },
      exportData: () => {
        routes.tableExportData
          .path({ tableId: table.id }, { attachment: false })
          .mouseClickNavigationHandler(undefined, true);
      },
      openAddNodeForm: () => {
        openForm({ type: "node", sm });
      },
      openAddEdgeForm: () => openForm({ type: "edge", sm }),
      predict: () => {
        assistantService.predict(table).then(() => {
          tableRef.current?.reload();
          uiSettings.table.enableEntityLinkingEditor();
        });
      },
    };

    const menu = (
      <Menu
        onClick={(event) => {
          if (!event.key.startsWith("manual-close")) {
            setMenuVisible(false);
          }
        }}
      >
        <Menu.ItemGroup key="group-sm" title="Semantic Descriptions">
          {semanticmodel.sms.length > 1 ? (
            <Menu.SubMenu
              key="list-model"
              title="List models"
              icon={<FontAwesomeIcon icon={faFloppyDisk} />}
            >
              {semanticmodel.sms.map((sm, index) => {
                return (
                  <Menu.Item
                    key={`sm-${sm.name}`}
                    onClick={() => semanticmodel.setIndex(index)}
                    style={{
                      fontWeight:
                        index === semanticmodel.index ? "bold" : undefined,
                    }}
                  >
                    {SemanticModel.isDraft(sm) ? (
                      <Tag color="orange">draft</Tag>
                    ) : sm.graph.stale ? (
                      <Tag color="orange">unsaved</Tag>
                    ) : null}
                    {sm.name}
                  </Menu.Item>
                );
              })}
            </Menu.SubMenu>
          ) : null}
          <Menu.Item
            key="save-model"
            disabled={!SemanticModel.isDraft(sm) && !sm.graph.stale}
            icon={<SaveOutlined />}
            onClick={funcs.saveModel}
          >
            Save current model
          </Menu.Item>
          <Menu.Item
            key="add-model"
            onClick={funcs.addModel}
            icon={<FileAddOutlined />}
          >
            Add new model
          </Menu.Item>
          <Menu.Item
            key="manual-close-0"
            danger={true}
            icon={<DeleteOutlined />}
          >
            <Popconfirm
              title="Are you sure to delete this semantic description?"
              onConfirm={funcs.deleteModel}
              onCancel={() => setMenuVisible(false)}
              okText="Yes"
              cancelText="No"
            >
              Delete current model
            </Popconfirm>
          </Menu.Item>
          <Menu.Item
            key="import-model"
            disabled={true}
            icon={<ImportOutlined />}
          >
            Import models
          </Menu.Item>
          <Menu.Item
            key="export-model"
            onClick={funcs.exportModel}
            icon={<ExportOutlined />}
          >
            Export models
          </Menu.Item>
        </Menu.ItemGroup>
        <Menu.Divider />
        <Menu.Item
          key="enable-el-editor"
          icon={<FontAwesomeIcon icon={faRectangleList} />}
          onClick={uiSettings.table.toggleEntityLinkingEditor}
        >
          Toggle Entity Linking Editor
        </Menu.Item>
        <Menu.Item
          key="export-data"
          icon={<FontAwesomeIcon icon={faDownload} />}
          onClick={funcs.exportData}
        >
          Export data
        </Menu.Item>
      </Menu>
    );

    return (
      <>
        <Space key="space-1" style={{ float: "right" }}>
          {graphRef.current === undefined ? null : (
            <Tag
              color={
                SemanticModel.isDraft(sm) || sm.graph.stale ? "orange" : "green"
              }
              style={{ marginRight: 0, cursor: "pointer" }}
              onClick={funcs.saveModel}
            >
              Status:{" "}
              {SemanticModel.isDraft(sm)
                ? "Draft"
                : sm.graph.stale
                ? "Changed"
                : "Saved"}
              {semanticmodel.sms.length > 1 ? ` (${sm.name})` : ""}
            </Tag>
          )}
          {uiSettings.table.showEntityLinkingEditor ? (
            <Tag
              color={"geekblue"}
              style={{ marginRight: 0, cursor: "pointer" }}
              onClick={uiSettings.table.toggleEntityLinkingEditor}
            >
              Editing Entity Linking
            </Tag>
          ) : null}
        </Space>
        <Space key="space-2">
          <Button size="small" onClick={graphRef.current?.recenter}>
            Center graph (C)
          </Button>
          <Button size="small" onClick={funcs.openAddNodeForm}>
            Add node
          </Button>
          <Button size="small" onClick={funcs.openAddEdgeForm}>
            Add edge
          </Button>
          <Button size="small" onClick={funcs.predict}>
            Predict
          </Button>
          <Dropdown
            overlay={menu}
            onVisibleChange={setMenuVisible}
            visible={menuVisible}
          >
            <Button size="small">
              More <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
      </>
    );
  }
);

function smUniqueIdent(sm: SemanticModel) {
  return SemanticModel.isDraft(sm) ? sm.draftID : sm.id;
}
