import { Entity, IncompleteEntity, isEntityComplete } from "./Entity";
import { ExternalLink } from "rma-baseapp";

/**
 * Render entity in a single line.
 */
export const InlineEntityComponent = ({
  entity,
  nolink = false,
  ...restprops
}: {
  entity: Entity | IncompleteEntity;
  nolink?: boolean;
} & Omit<React.HTMLProps<HTMLAnchorElement>, "href" | "target" | "rel">) => {
  if (!isEntityComplete(entity)) {
    if (entity.doesNotExist) {
      return (
        <span {...restprops}>
          <i>Entity {entity.id} doesn't exist</i>
        </span>
      );
    } else if (nolink) {
      return <span {...restprops}>({entity.id})</span>;
    } else {
      return (
        <ExternalLink
          href={Entity.id2uri(entity.id)}
          openInNewPage={true}
          {...restprops}
        >
          ({entity.id})
        </ExternalLink>
      );
    }
  }

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
      {...restprops}
    >
      {entity.label["en"]} ({entity.id})
    </ExternalLink>
  );
};
