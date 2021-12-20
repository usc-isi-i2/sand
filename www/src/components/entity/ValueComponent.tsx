import { withStyles, WithStyles } from "@material-ui/styles";
import { Row } from "antd";
import React from "react";
import { FetchEntityComponent, InlineEntityComponent } from ".";
import { DataValue, Statement } from "../../models/entity";

const styles = {};

export const ValueComponent = withStyles(styles)(
  ({ value }: { value: DataValue } & WithStyles<typeof styles>) => {
    if (value.type === "entityid") {
      return (
        <FetchEntityComponent
          entityId={value.value as string}
          render={(entity) => {
            return <InlineEntityComponent entity={entity} />;
          }}
        />
      );
    }

    // haven't handle these types
    if (typeof value.value === "object") {
      return <span>{JSON.stringify(value.value)}</span>;
    }

    return <span>{value.value}</span>;
  }
);
