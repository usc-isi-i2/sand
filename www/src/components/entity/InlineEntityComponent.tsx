import { ExternalLink } from "gena-app";
import { Entity } from "./Entity";

/**
 * Render entity in a single line.
 *
 * @param entity the entity to render
 * @param noLink whether to render the entity as plain text (not clickable to open a page)
 */
export const InlineEntityComponent = ({
  entity,
  nolink = false,
  onCtrlClick,
  ...restprops
}: {
  entity: Entity;
  nolink?: boolean;
  onCtrlClick?: () => void;
} & Omit<React.HTMLProps<HTMLAnchorElement>, "href" | "target" | "rel">) => {
  if (nolink) {
    return <span {...restprops}>{entity.readableLabel}</span>;
  }

  return (
    <ExternalLink
      href={entity.uri}
      openInNewPage={true}
      onCtrlClick={onCtrlClick}
      {...restprops}
    >
      {entity.readableLabel}
    </ExternalLink>
  );
};
