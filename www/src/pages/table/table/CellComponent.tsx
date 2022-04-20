import { withStyles, WithStyles } from "@material-ui/styles";
import {
  FetchEntityComponent,
  openPageEntityComponent,
  PopoverEntityComponent,
} from "../../../components/entity";
import { grey } from "@ant-design/colors";
import { CandidateEntityListComponent } from "./CandidateEntityListComponent";
import { ExternalLink } from "gena-app";
import { TableRow } from "../../../models/table";
import { observer } from "mobx-react";
import { useStores } from "../../../models";
import { appConfig } from "../../../models/settings";

const styles = {
  link: {
    textDecoration: "underline",
    "&:hover": {
      textDecoration: "underline",
    },
  },
  noEntityLink: {
    color: grey[5],
    "&:hover": {
      color: grey[5],
    },
  },
};

export const CellComponent = withStyles(styles)(
  observer(
    ({
      cell,
      record,
      index,
      classes,
      topK = 3,
    }: {
      cell: string;
      record: TableRow;
      index: number;
      topK?: number;
    } & WithStyles<typeof styles>) => {
      const { uiSettings } = useStores();

      const links = record.links[index] || [];
      let components = links.flatMap((link, index) => {
        let prefix =
          index === 0
            ? cell.substring(0, link.start)
            : cell.substring(links[index - 1].end, link.start);
        let linksurface = cell.substring(link.start, link.end);
        let onCtrlClick = undefined;
        if (link.entityId !== undefined) {
          onCtrlClick = () => {
            openPageEntityComponent(link.entityId!);
          };
        }
        const infix =
          link.url === undefined && link.entityId === undefined ? (
            linksurface
          ) : (
            <ExternalLink
              key={index}
              href={link.url}
              openInNewPage={true}
              dangerouslySetInnerHTML={{
                __html: linksurface.trim() === "" ? "&blank;" : linksurface,
              }}
              className={
                classes.link +
                (link.entityId === undefined ||
                link.entityId === appConfig.NIL_ENTITY
                  ? " " + classes.noEntityLink
                  : "")
              }
              style={link.entityId === null ? { color: "#aaa" } : {}}
              onCtrlClick={onCtrlClick}
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
            render={(entity, settings) => (
              <PopoverEntityComponent
                entity={entity}
                zIndex={500}
                settings={settings}
              >
                {infix}
              </PopoverEntityComponent>
            )}
            renderNotFound={() => (
              <span className={classes.noEntityLink}>{infix}</span>
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
          {uiSettings.table.showEntityLinkingEditor &&
          typeof record.row[index] !== "number" ? (
            <CandidateEntityListComponent
              record={record}
              index={index}
              topK={topK}
            />
          ) : null}
        </div>
      );
    }
  )
);
