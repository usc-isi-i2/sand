import { withStyles, WithStyles } from "@material-ui/styles";
import { ExternalLink } from "gena-app";
import { DataValue } from "../../models/entity";
import { CollapsibleComponent } from "../element/Collapse";
import { FetchEntityComponent } from "./FetchEntityComponent";
import { InlineEntityComponent } from "./InlineEntityComponent";

const styles = {};

export const ValueComponent = withStyles(styles)(
  ({ value }: { value: DataValue } & WithStyles<typeof styles>) => {
    if (value.type === "entityid") {
      return (
        <FetchEntityComponent
          entityId={value.value}
          render={(entity) => {
            return <InlineEntityComponent entity={entity} />;
          }}
        />
      );
    }

    if (value.type === "time") {
      return (
        <CollapsibleComponent
          collapsible={
            <ul>
              <li>
                <b>Timezone:</b> {value.value.timezone}
              </li>
              <li>
                <b>From:</b> {value.value.before} - {value.value.after}
              </li>
              <li>
                <b>Precision:</b> {value.value.precision}
              </li>
              <li>
                <b>Calendar Model:</b>{" "}
                <ExternalLink
                  href={value.value.calendarmodel}
                  openInNewPage={true}
                >
                  {value.value.calendarmodel}
                </ExternalLink>
              </li>
            </ul>
          }
        >
          {value.value.time}
        </CollapsibleComponent>
      );
    }

    if (value.type === "quantity") {
      return (
        <CollapsibleComponent
          collapsible={
            <ul>
              <li>
                <b>Bound:</b> {value.value.lowerBound} -{" "}
                {value.value.upperBound}
              </li>
              <li>
                <b>Unit:</b> {value.value.unit}
              </li>
            </ul>
          }
        >
          {value.value.amount}
        </CollapsibleComponent>
      );
    }

    if (value.type === "monolingualtext") {
      return (
        <span>
          {value.value.text} <i>@{value.value.language}</i>
        </span>
      );
    }

    if (value.type === "globecoordinate") {
      return (
        <CollapsibleComponent
          collapsible={
            <ul>
              <li>
                <b>Precision:</b> {value.value.precision}
              </li>
              <li>
                <b>Globe:</b>{" "}
                <ExternalLink href={value.value.globe} openInNewPage={true}>
                  {value.value.globe}
                </ExternalLink>
              </li>
            </ul>
          }
        >
          <ExternalLink
            href={`http://maps.google.com/maps?q=${value.value.latitude},${value.value.longitude}`}
            openInNewPage={true}
          >
            {value.value.latitude} N,{value.value.longitude} W
          </ExternalLink>
        </CollapsibleComponent>
      );
    }

    // haven't handle these types
    if (typeof value.value === "object") {
      return <span>{JSON.stringify(value.value)}</span>;
    }

    return <span>{value.value}</span>;
  }
);
