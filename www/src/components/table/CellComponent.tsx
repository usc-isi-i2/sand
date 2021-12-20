import * as RTable from "./RelationalTable";
import { Button, Modal, Popover, Space, Typography } from "antd";
import { withStyles, WithStyles } from "@material-ui/styles";
import { Number, CheckboxIcon } from "../element";
import { faCheck, faCheckDouble } from "@fortawesome/free-solid-svg-icons";
import {
  Entity,
  FetchEntityComponent,
  InlineEntityComponent,
  PopoverEntityComponent,
} from "../entity";
import { blue, grey } from "@ant-design/colors";
import React, { useMemo, useState } from "react";
import ProTable from "@ant-design/pro-table";
import { CandidateEntityListComponent } from "./CandidateEntityListComponent";

const styles = {
  link: {
    textDecoration: "underline",
  },
  noEntityLink: {
    color: grey[5],
  },
};

export const CellComponent = withStyles(styles)(
  ({
    cell,
    record,
    index,
    classes,
    topK = 3,
  }: {
    cell: string;
    record: RTable.Row;
    index: number;
    topK?: number;
  } & WithStyles<typeof styles>) => {
    const links = record.links[index] || [];
    let components = links.flatMap((link, index) => {
      let prefix =
        index === 0
          ? cell.substring(0, link.start)
          : cell.substring(links[index - 1].end, link.start);
      let linksurface = cell.substring(link.start, link.end);
      const infix = (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          dangerouslySetInnerHTML={{
            __html: linksurface.trim() === "" ? "&blank;" : linksurface,
          }}
          className={
            classes.link +
            (link.entityId === undefined ? " " + classes.noEntityLink : "")
          }
          style={link.entityId === null ? { color: "#aaa" } : {}}
        />
      );

      if (link.entityId === undefined) {
        return [prefix, infix];
      }

      // reassign to infix somehow killing the application
      const wrappedInfix = (
        <FetchEntityComponent
          key={index}
          entityId={link.entityId}
          render={(entity) => (
            <PopoverEntityComponent entity={entity}>
              {infix}
            </PopoverEntityComponent>
          )}
        />
      );

      return [prefix, wrappedInfix];
    });

    if (links.length === 0) {
      components.push(cell);
    } else {
      components.push(cell.substring(links[links.length - 1].end));
    }

    return (
      <div>
        {components}
        <CandidateEntityListComponent
          record={record}
          index={index}
          topK={topK}
        />
      </div>
    );
  }
);
