import { ExternalLink } from "gena-app";
import { Property } from "../../models";
import { IncompleteProperty, isPropertyComplete } from "./Entity";

/**
 * Render property in a single line.
 *
 * @param property the property to render
 * @param noLink whether to render the property as plain text (not clickable to open a page)
 */
export const InlinePropertyComponent = ({
  property,
  nolink = false,
  showId = false,
  ...restprops
}: {
  property: Property | IncompleteProperty;
  showId?: boolean;
  nolink?: boolean;
} & Omit<
  React.HTMLProps<HTMLAnchorElement>,
  "href" | "target" | "rel" | "property"
>) => {
  if (!isPropertyComplete(property)) {
    if (property.doesNotExist) {
      return (
        <span {...restprops}>
          <i>Property {property.id} doesn't exist</i>
        </span>
      );
    } else if (nolink) {
      return <span {...restprops}>({property.id})</span>;
    } else {
      // TODO: we need to have a way to handle id & uri properly
      // create a local page for the property? for entity add uri to part of the entity
      return (
        <ExternalLink href={""} openInNewPage={true} {...restprops}>
          ({property.id})
        </ExternalLink>
      );
    }
  }

  if (nolink) {
    return (
      <span {...restprops}>
        {property.label} ({property.id})
      </span>
    );
  }

  const label = showId ? `${property.label} (${property.id})` : property.label;

  return (
    <ExternalLink href={property.uri} openInNewPage={true} {...restprops}>
      {label}
    </ExternalLink>
  );
};
