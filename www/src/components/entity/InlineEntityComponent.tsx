import { ExternalLink } from "rma-baseapp";
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
    return (
      <span {...restprops}>
        {entity.label["en"]} ({entity.id})
      </span>
    );
  }

  return (
    <ExternalLink
      href={Entity.id2uri(entity.id)}
      openInNewPage={true}
      onCtrlClick={onCtrlClick}
      {...restprops}
    >
      {entity.label["en"]} ({entity.id})
    </ExternalLink>
  );
};
