import { InboxOutlined } from "@ant-design/icons";
import { withStyles, WithStyles } from "@material-ui/styles";
import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Typography,
  Upload,
} from "antd";
import { ModalStaticFunctions } from "antd/lib/modal/confirm";
import React, { useState } from "react";
import { useStores } from "../../../../models";
import {
  ParserOpts,
  Project,
  UploadingTable,
} from "../../../../models/project";
import { ParserOptsForm } from "./ParserOptsComponent";
import { RawTableComponent } from "./RawTableComponent";

const styles = {
  upload: {
    "& > .ant-upload": {
      padding: "8px 0 !important",
    },
  },
  carouselDot: {
    zIndex: 2000,
    backgroundColor: "black",
    opacity: 0,
  },
};

export const UploadPhase1 = withStyles(styles)(
  ({
    classes,
    projectId,
    setUploadTable,
  }: {
    setUploadTable: (item: UploadingTable, file: File) => void;
    projectId: number;
  } & WithStyles<typeof styles>) => {
    const { projectStore } = useStores();

    const onChange = (props: any) => {
      const file: File = props.file;
      projectStore.uploadTable(projectId, file).then((tbl) => {
        if (Array.isArray(tbl)) {
          throw new Error("Error");
        }
        setUploadTable(tbl, file);
      });
    };

    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        <Upload.Dragger
          name="file"
          multiple={false}
          onChange={onChange}
          beforeUpload={() => false}
          className={classes.upload}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-hint">
            Click or drag file to this area to upload
          </p>
        </Upload.Dragger>

        <Form layout="inline">
          <Form.Item
            name="url"
            label="URL"
            rules={[{ required: true }]}
            style={{ width: "calc(100% - 94px)" }}
          >
            <Input />
          </Form.Item>
          <Form.Item style={{ margin: 0 }}>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Space>
    );
  }
);

export const UploadPhase2 = withStyles(styles)(
  ({
    uploadingTable,
    setParserOpts,
    classes,
    projectId,
    destroy,
    onDone,
  }: {
    uploadingTable: { table: UploadingTable; file: File; version: number };
    setParserOpts: (opts: ParserOpts) => void;
    destroy: () => void;
    onDone: () => void;
    projectId: number;
  } & WithStyles<typeof styles>) => {
    const { projectStore } = useStores();
    const [selectedTables, setSelectedTables] = useState(
      uploadingTable.table.tables.map(() => true)
    );
    let tables;

    if (uploadingTable.table.tables.length === 1) {
      tables = (
        <RawTableComponent
          key={`version-${uploadingTable.version}`}
          table={uploadingTable.table.tables[0]}
        />
      );
    } else {
      tables = uploadingTable.table.tables.map((table, index) => {
        return (
          <Space
            direction="vertical"
            style={{ width: "100%" }}
            key={`table-${index}-wrap`}
          >
            <Typography.Text>
              Select:&nbsp;
              <Switch
                checked={selectedTables[index]}
                onChange={(checked) => {
                  const lst = selectedTables.slice();
                  lst[index] = checked;
                  setSelectedTables(lst);
                }}
              />
            </Typography.Text>
            <RawTableComponent
              key={`version-${uploadingTable.version}`}
              table={table}
            />
            ,
          </Space>
        );
      });
    }

    const finishUpload = () => {
      const tableIndex: number[] = [];
      selectedTables.forEach((flag, index) => {
        if (flag) tableIndex.push(index);
      });

      return projectStore
        .uploadTable(
          projectId,
          uploadingTable.file,
          uploadingTable.table.parserOpts,
          tableIndex
        )
        .then((result) => {
          destroy();
          onDone();
        });
    };

    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        <ParserOptsForm
          parserOpts={uploadingTable.table.parserOpts}
          setParserOpts={setParserOpts}
        />
        {tables}
        <Space>
          <Button type="primary" onClick={finishUpload}>
            Confirm
          </Button>
          {/* <Button
            type="primary"
            onClick={() => {
              finishUpload().then(() => {
                // TODO: re-open the upload form
              });
            }}
          >
            Confirm & Upload
          </Button> */}
        </Space>
      </Space>
    );
  }
);

export const UploadTableForm = ({
  project,
  destroy,
  onDone,
}: {
  project: Project;
  destroy: () => void;
  onDone?: () => void;
}) => {
  const { projectStore } = useStores();
  const [phase, setPhase] = useState<"phase1" | "phase2">("phase1");
  const [uploadingTable, setUploadingTable] = useState<
    { table: UploadingTable; file: File; version: number } | undefined
  >(undefined);

  if (phase === "phase1") {
    return (
      <UploadPhase1
        projectId={project.id}
        setUploadTable={(table, file) => {
          setUploadingTable({ table, file, version: 0 });
          setPhase("phase2");
        }}
      />
    );
  }

  if (phase === "phase2") {
    return (
      <UploadPhase2
        projectId={project.id}
        uploadingTable={uploadingTable!}
        setParserOpts={(opts) => {
          projectStore
            .uploadTable(project.id, uploadingTable!.file, opts)
            .then((tbl) => {
              if (Array.isArray(tbl)) {
                throw new Error("Error");
              }
              setUploadingTable({
                table: tbl,
                file: uploadingTable!.file,
                version: uploadingTable!.version + 1,
              });
            });
        }}
        destroy={destroy}
        onDone={onDone || (() => {})}
      />
    );
  }

  return <></>;
};

export const openUploadTableForm = (
  project: Project,
  cfg?: {
    zIndex?: number;
    modal?: Omit<ModalStaticFunctions, "warn">;
    onDone?: () => void;
  }
) => {
  const modal = cfg?.modal === undefined ? Modal : cfg.modal;
  const ref = modal.info({
    title: (
      <span style={{ marginBottom: 16, display: "inline-block" }}>
        Upload Tables
      </span>
    ),
    bodyStyle: { margin: -8 },
    okButtonProps: { style: { display: "none" } },
    maskClosable: true,
    mask: true,
    zIndex: cfg?.zIndex,
    width: "calc(100% - 128px)",
    style: { top: 64 },
  });
  ref.update({
    content: (
      <UploadTableForm
        project={project}
        destroy={ref.destroy}
        onDone={cfg?.onDone}
      />
    ),
  });
};
