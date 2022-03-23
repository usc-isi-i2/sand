import axios from "axios";
import { action, makeObservable, observable } from "mobx";
import { ApplicationConfig } from "./ApplicationConfig";
import { EntitySettings } from "./EntitySettings";
import { TableSettings } from "./TableSettings";

export const appConfig = new ApplicationConfig();

export class UISettings {
  public entity: EntitySettings;
  public table: TableSettings;

  constructor() {
    this.entity = new EntitySettings();
    this.table = new TableSettings();

    makeObservable(this, {
      entity: observable,
      table: observable,
      fetchSettings: action,
    });
  }

  /** Fetch settings from the server */
  async fetchSettings() {
    const resp = await axios.get("/api/settings");
    appConfig.setInstanceOf(resp.data["entity"]["instanceof"]);
    appConfig.NIL_ENTITY = resp.data["entity"]["nil"];
    appConfig.SEM_MODEL_IDENTS = new Set(
      resp.data["semantic_model"]["identifiers"]
    );
    appConfig.SEM_MODEL_STATEMENTS = new Set(
      resp.data["semantic_model"]["statements"]
    );

    // add a default instanceof property to the popover view
    const instanceOf: string[] = Object.values(
      resp.data["entity"]["instanceof"]
    );
    if (instanceOf.length > 0) {
      this.entity.addShowedPropsInPopoverView(instanceOf[0]);
    }
  }
}

export { EntitySettings, TableSettings };
