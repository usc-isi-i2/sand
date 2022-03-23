import { action, computed, makeObservable, observable } from "mobx";

export class EntitySettings {
  // properties to show in full view
  public _showedPropsInFullView: Set<string> = new Set();

  // properties to show in popover view
  public _showedPropsInPopoverView: Set<string> = new Set();

  // properties that are used to express "instance of" relationships for each namespace
  public instanceofProps: { [namespace: string]: string } = {};

  // id of an nil entity
  public nilEntityId: string = "";

  constructor() {
    makeObservable(this, {
      _showedPropsInFullView: observable,
      _showedPropsInPopoverView: observable,
      instanceofProps: observable,
      nilEntityId: observable,
      setNilEntityId: action,
      setInstanceOfProps: action,
      showedPropsInFullView: computed,
      showedPropsInPopoverView: computed,
      setShowedPropsInFullView: action,
      setShowedPropsInPopoverView: action,
      addShowedPropsInFullView: action,
      addShowedPropsInPopoverView: action,
      removeShowedPropsInFullView: action,
      removeShowedPropsInPopoverView: action,
      getInstanceOfProp: action,
    });
  }

  get showedPropsInFullView() {
    return Array.from(this._showedPropsInFullView);
  }

  get showedPropsInPopoverView() {
    return Array.from(this._showedPropsInPopoverView);
  }

  setNilEntityId = (nil: string) => {
    this.nilEntityId = nil;
  };

  setInstanceOfProps = (cfg: { [namespace: string]: string }) => {
    this.instanceofProps = cfg;
  };

  setShowedPropsInFullView = (props: Set<string>) => {
    this._showedPropsInFullView = props;
  };

  setShowedPropsInPopoverView = (props: Set<string>) => {
    this._showedPropsInPopoverView = props;
  };

  addShowedPropsInFullView = (prop: string) => {
    this._showedPropsInFullView.add(prop);
  };

  addShowedPropsInPopoverView = (prop: string) => {
    this._showedPropsInPopoverView.add(prop);
  };

  removeShowedPropsInFullView = (prop: string) => {
    this._showedPropsInFullView.delete(prop);
  };

  removeShowedPropsInPopoverView = (prop: string) => {
    this._showedPropsInPopoverView.delete(prop);
  };

  getInstanceOfProp = (uri: string) => {
    // TODO: optimize me, we can get it down to O(1) with proper indexing
    for (const ns in this.instanceofProps) {
      if (uri.startsWith(this.instanceofProps[ns])) {
        return this.instanceofProps[uri];
      }
    }
  };
}
