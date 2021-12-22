import { RStore } from "rma-baseapp";
import { SERVER } from "../../env";

export interface Property {
  id: string;
  uri: string;
  label: string;
  readableLabel: string;
  aliases: string[];
  description: string;
  parents: string[];
}

export class PropertyStore extends RStore<string, Property> {
  constructor() {
    super(
      `${SERVER}/api/properties`,
      { readableLabel: "readable_label" },
      false
    );
  }
}
