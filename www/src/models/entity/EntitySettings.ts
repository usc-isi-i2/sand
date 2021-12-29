import { action, computed, makeObservable, observable } from "mobx";

export class EntitySettings {
  // properties to show in full view
  public _showedPropsInFullView: Set<string> = new Set();

  // properties to show in popover view
  public _showedPropsInPopoverView: Set<string> = new Set();

  constructor() {
    this._showedPropsInPopoverView.add("P31");

    makeObservable(this, {
      _showedPropsInFullView: observable,
      _showedPropsInPopoverView: observable,
      showedPropsInFullView: computed,
      showedPropsInPopoverView: computed,
      setShowedPropsInFullView: action,
      setShowedPropsInPopoverView: action,
      addShowedPropsInFullView: action,
      addShowedPropsInPopoverView: action,
      removeShowedPropsInFullView: action,
      removeShowedPropsInPopoverView: action,
    });
  }

  get showedPropsInFullView() {
    return Array.from(this._showedPropsInFullView);
  }

  get showedPropsInPopoverView() {
    return Array.from(this._showedPropsInPopoverView);
  }

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
}
