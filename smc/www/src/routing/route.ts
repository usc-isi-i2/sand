import { Location } from "history";
import { PLATFORM } from "../env";
import { createBrowserHistory, createMemoryHistory } from "history";
import { Modal } from "antd";
import { matchPath, RouteComponentProps } from "react-router";
import React from "react";

function getUserConfirmation(
  message: string,
  callback: (result: boolean) => void
) {
  Modal.confirm({
    title: message,
    okText: "Leave",
    okType: "primary",
    okButtonProps: { danger: true },
    cancelText: "Stay",
    onOk() {
      callback(true);
    },
    onCancel() {
      // reverse ok and cancel doesn't work since antd detect escape keyword as cancel.
      callback(false);
    },
  });
}

export const history =
  PLATFORM === "native"
    ? createMemoryHistory({
        getUserConfirmation,
      })
    : createBrowserHistory({
        getUserConfirmation,
      });

type ReactComponent =
  | React.ComponentType<RouteComponentProps<any>>
  | React.ComponentType<any>;

export class PathDef<URLArgs, QueryArgs> {
  // definition of a path in react-router styles. e.g., /accounts/:id
  public pathDef: string;
  // is equivalent to the `exact` property of the Route component in react-router (whether it should match with its descendant)
  public exact: boolean;
  // equivalent to `strict`: when true, a path that has a trailing slash will only match a location.pathname with a trailing slash. This has no effect when there are additional URL segments in the location.pathname.
  public strict: boolean;
  // hold properties of Route component in react-router
  public routeDef: {
    path: string;
    exact: boolean;
    strict: boolean;
    component: ReactComponent;
  };

  public constructor(
    component: ReactComponent,
    pathDef: string,
    exact: boolean = false,
    strict: boolean = false
  ) {
    this.pathDef = pathDef;
    this.exact = exact;
    this.strict = strict;
    this.routeDef = { path: pathDef, exact, strict, component };
  }

  /**
   * Create a path based on the given arguments.
   *
   * Note: this function should be used only when we build a link for <a> element
   * since it won't follow the semantic of react-router but more like when you open a link
   * at the first time in the browser (that's why for hash history, we have to add `#`)
   */
  public getURL(urlArgs: URLArgs, queryArgs: QueryArgs): string {
    let path = this.pathDef;

    if (urlArgs !== null) {
      for (let v in urlArgs) {
        path = path.replace(`:${v}`, urlArgs[v] as any as string);
      }
    }

    if (queryArgs !== null) {
      path = `${path}?${new URLSearchParams(queryArgs as any).toString()}`;
    }

    return path;
  }

  /**
   * Create a location that the history object can be pushed
   */
  public location(urlArgs: URLArgs, queryArgs: QueryArgs): Location<any> {
    let path = this.pathDef;
    if (urlArgs !== null) {
      for (let v in urlArgs) {
        path = path.replace(`:${v}`, urlArgs[v] as any as string);
      }
    }

    return {
      pathname: path,
      search:
        queryArgs === null || queryArgs === undefined
          ? ""
          : "?" + new URLSearchParams(queryArgs as any).toString(),
      hash: "",
      state: undefined,
    };
  }

  /**
   * Build a path that can be used to navigate to a link
   */
  public path(
    urlArgs: URLArgs,
    queryArgs: QueryArgs
  ): Path<URLArgs, QueryArgs> {
    return new Path(this, urlArgs, queryArgs);
  }

  /**
   * Get URL params of this route
   */
  public getURLArgs(location: Location<any>): URLArgs | undefined {
    const m = matchPath(location.pathname, this.routeDef);
    if (m === null) {
      return undefined;
    }
    return m.params as URLArgs;
  }
}

/**
 * Overwrite the PathDef class to provide a better using experience
 */
export class NoArgsPathDef extends PathDef<null, null> {
  private _path: Path<null, null>;

  public constructor(
    component: ReactComponent,
    pathDef: string,
    exact: boolean = false,
    strict: boolean = false
  ) {
    super(component, pathDef, exact, strict);
    this._path = new Path(this, null, null);
  }

  public getURL(): string {
    return super.getURL(null, null);
  }

  public location(): Location<any> {
    return super.location(null, null);
  }

  public path(): Path<null, null> {
    return this._path;
  }
}

/**
 * Overwrite the PathDef class to provide a better using experience
 */
export class NoQueryArgsPathDef<URLArgs> extends PathDef<URLArgs, null> {
  public constructor(
    component: ReactComponent,
    pathDef: string,
    exact: boolean = false,
    strict: boolean = false
  ) {
    super(component, pathDef, exact, strict);
  }

  public getURL(urlArgs: URLArgs): string {
    return super.getURL(urlArgs, null);
  }

  public location(urlArgs: URLArgs): Location<any> {
    return super.location(urlArgs, null);
  }

  public path(urlArgs: URLArgs): Path<URLArgs, null> {
    return new Path(this, urlArgs, null);
  }
}

class Path<URLArgs, QueryArgs> {
  private pathDef: PathDef<URLArgs, QueryArgs>;
  private urlArgs: URLArgs;
  private queryArgs: QueryArgs;

  public constructor(
    pathDef: PathDef<URLArgs, QueryArgs>,
    urlArgs: URLArgs,
    queryArgs: QueryArgs
  ) {
    this.pathDef = pathDef;
    this.urlArgs = urlArgs;
    this.queryArgs = queryArgs;
  }

  /**
   * Open this path
   */
  public open() {
    history.push(this.pathDef.location(this.urlArgs, this.queryArgs));
  }

  /**
   * Handler for a mouse event navigation (e.g., linking on an <a> element)
   */
  public mouseClickNavigationHandler = (e?: React.MouseEvent) => {
    if (e !== undefined) {
      e.preventDefault();
    }

    if (e !== undefined && (e.ctrlKey || e.metaKey)) {
      // holding ctrl or cmd key, we should open in new windows
      window.open(this.pathDef.getURL(this.urlArgs, this.queryArgs), "_blank");
      // keep the focus on this page
      window.focus();
    } else {
      history.push(this.pathDef.location(this.urlArgs, this.queryArgs));
    }
  };
}

/**
 * Export routing functions to global navigation behaviour on different platforms
 */
export const routeAPIs = {
  internalHTMLLinkClickFnId: "window._routeAPIs.internalHTMLLinkClick",
  history: history,
  internalHTMLLinkClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    let href = (e.target as any).getAttribute("href");
    if (e.ctrlKey || e.metaKey) {
      // holding ctrl or cmd key, we should open in new windows, even in native, because it is internal, another window still work
      window.open(href, "_blank");
      window.focus();
    } else {
      history.push(href);
    }
  },
  goBack: () => history.goBack(),
  goForward: () => history.goForward(),
  openInternalLink: (href: string) => {
    history.push(href);
  },
};
(window as any)._routeAPIs = routeAPIs;
