import { blue, grey } from "@ant-design/colors";
import ProTable from "@ant-design/pro-table";
import { faCheck, faCheckDouble } from "@fortawesome/free-solid-svg-icons";
import { withStyles, WithStyles } from "@material-ui/styles";
import { Button, Modal, Space, Typography } from "antd";
import React, { useState } from "react";
import { CheckboxIcon, Number } from "../element";
import {
  FetchEntityComponent,
  InlineEntityComponent,
  PopoverEntityComponent,
} from "../entity";
import * as RTable from "./RelationalTable";

const styles = {
  correctCandidateEntity: {
    color: blue[5],
  },
  candidateEntity: {
    color: grey[5],
    "&:hover": {
      color: `${grey[5]} !important`,
    },
  },
  candidateEntitySeeMore: {
    color: grey[5],
    cursor: "pointer",
  },
};

export const CandidateEntityListComponent = withStyles(styles)(
  ({
    record,
    index,
    classes,
    topK = 3,
  }: {
    record: RTable.Row;
    index: number;
    topK?: number;
  } & WithStyles<typeof styles>) => {
    const [showAllCandidateModals, setShowAllCandidateModals] = useState(false);

    const links = record.links[index] || [];
    const candidateLst = [];
    if (links.length > 0) {
      for (let candidateEntity of links[0].candidateEntities.slice(0, topK)) {
        const className =
          candidateEntity.entityId === links[0].entityId
            ? classes.correctCandidateEntity
            : classes.candidateEntity;

        candidateLst.push(
          <div key={candidateEntity.entityId}>
            <Space size={4}>
              <CheckboxIcon icon={faCheck} />
              <CheckboxIcon icon={faCheckDouble} />
              <FetchEntityComponent
                entityId={candidateEntity.entityId}
                render={(entity) => (
                  <PopoverEntityComponent entity={entity}>
                    <InlineEntityComponent
                      nolink={true}
                      entity={entity}
                      className={className}
                    />
                  </PopoverEntityComponent>
                )}
              />
              <span className={className}>
                (
                <Number
                  value={candidateEntity.probability}
                  fractionDigits={3}
                />
                )
              </span>
            </Space>
          </div>
        );
      }

      // if there is a correct entity in top K, no need to highlight, otherwise,
      // add them to the list
      const idx = links[0].candidateEntities.findIndex(
        (candidate) => candidate.entityId === links[0].entityId
      );
      if (idx !== -1 && idx >= topK) {
        const candidateEntity = links[0].candidateEntities[idx];
        candidateLst.push(
          <div key={candidateEntity.entityId}>
            <Space size={4}>
              <CheckboxIcon icon={faCheck} />
              <CheckboxIcon icon={faCheckDouble} />
              <FetchEntityComponent
                entityId={candidateEntity.entityId}
                render={(entity) => (
                  <span className={classes.correctCandidateEntity}>
                    ({idx})&nbsp;
                    <PopoverEntityComponent entity={entity}>
                      <InlineEntityComponent nolink={true} entity={entity} />
                    </PopoverEntityComponent>
                  </span>
                )}
              />
              <span className={classes.correctCandidateEntity}>
                (
                <Number
                  value={candidateEntity.probability}
                  fractionDigits={3}
                />
                )
              </span>
            </Space>
          </div>
        );
      }

      if (links[0].candidateEntities.length > topK) {
        candidateLst.push(
          <div key="see-more">
            <Typography.Text
              className={classes.candidateEntitySeeMore}
              onClick={() => setShowAllCandidateModals(!showAllCandidateModals)}
            >
              See more
            </Typography.Text>
          </div>
        );
      }
    }

    const columns: any = [
      {
        dataIndex: "id",
        title: "Entity",
        render: (entityId: string) => {
          return (
            <FetchEntityComponent
              entityId={entityId}
              render={(entity) => (
                <PopoverEntityComponent entity={entity}>
                  <InlineEntityComponent nolink={true} entity={entity} />
                </PopoverEntityComponent>
              )}
            />
          );
        },
      },
      {
        dataIndex: "score",
        title: "Score",
        render: (score: number) => {
          return <Number value={score} fractionDigits={5} />;
        },
      },
      {
        title: "action",
        render: () => {
          return (
            <Space size={4}>
              <Button>Select</Button>
            </Space>
          );
        },
      },
    ];

    return (
      <React.Fragment>
        {candidateLst}
        <Modal
          title="Candidate Entities"
          visible={showAllCandidateModals}
          style={{ top: 20 }}
          bodyStyle={{ padding: 0 }}
          width={"60%"}
          onOk={() => setShowAllCandidateModals(false)}
          onCancel={() => setShowAllCandidateModals(false)}
        >
          <ProTable
            defaultSize="small"
            bordered={true}
            search={false}
            pagination={{
              pageSize: 20,
              pageSizeOptions: ["20", "50", "100", "200", "500", "1000"],
            }}
            rowKey="id"
            columns={columns}
            request={async (params, sort, filter) => {
              return Promise.resolve({
                total: links.length > 0 ? links[0].candidateEntities.length : 0,
                success: true,
                data:
                  links.length === 0
                    ? []
                    : links[0].candidateEntities
                        .slice(
                          (params.current! - 1) * params.pageSize!,
                          params.current! * params.pageSize!
                        )
                        .map((candidateEntity, index) => ({
                          id: candidateEntity.entityId,
                          score: candidateEntity.probability,
                        })),
              });
            }}
          ></ProTable>
        </Modal>
      </React.Fragment>
    );
  }
);
