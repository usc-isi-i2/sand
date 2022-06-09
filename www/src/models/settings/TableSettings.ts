import { action, makeObservable, observable } from "mobx";

export class TableSettings {
  // page size
  public pageSize: number = 5;
  public showEntityLinkingEditor: boolean = false;

  constructor() {
    makeObservable(this, {
      pageSize: observable,
      showEntityLinkingEditor: observable,
      setPageSize: action,
      toggleEntityLinkingEditor: action,
      enableEntityLinkingEditor: action,
    });
  }

  setPageSize = (pageSize: number) => {
    this.pageSize = pageSize;
  };

  toggleEntityLinkingEditor = () => {
    this.showEntityLinkingEditor = !this.showEntityLinkingEditor;
  };

  enableEntityLinkingEditor = () => {
    this.showEntityLinkingEditor = true;
  };
}
