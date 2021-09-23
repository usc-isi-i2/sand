import React from "react";
import { PLATFORM } from "../env";
import { PathDef, routeAPIs } from "./route";

/**
 * This file contains all helper to dealing with Links and Navigation in the application so that we can handle it easier in different platforms
 */

interface InternalLinkProps<URLArgs, QueryArgs> {
  path: PathDef<URLArgs, QueryArgs>;
  urlArgs: URLArgs;
  queryArgs: QueryArgs;
  className?: string;
  style?: object;
  // other properties are for passing down dynamically from parent to <a> element
  onContextMenu?: any;
  onMouseDown?: any;
  onTouchStart?: any;
  onMouseEnter?: any;
  onMouseLeave?: any;
  onFocus?: any;
  onBlur?: any;
}
interface InternalLinkState { }

export class InternalLink<URLArgs, QueryArgs> extends React.Component<
  InternalLinkProps<URLArgs, QueryArgs>,
  InternalLinkState
  > {
  public state: InternalLinkState = {};

  onClick = (e: any) => {
    this.props.path
      .path(this.props.urlArgs, this.props.queryArgs)
      .mouseClickNavigationHandler(e);
  };

  render() {
    return (
      <a
        href={this.props.path.getURL(this.props.urlArgs, this.props.queryArgs)}
        onClick={this.onClick}
        style={this.props.style}
        className={this.props.className}
        onContextMenu={this.props.onContextMenu}
        onMouseDown={this.props.onMouseDown}
        onTouchStart={this.props.onTouchStart}
        onMouseEnter={this.props.onMouseEnter}
        onMouseLeave={this.props.onMouseLeave}
        onFocus={this.props.onFocus}
        onBlur={this.props.onBlur}
      >
        {this.props.children}
      </a>
    );
  }
}

interface ExternalLinkProps {
  href: string;
  openInNewPage?: boolean;
}

export const ExternalLink: React.FunctionComponent<ExternalLinkProps> = ({
  href,
  openInNewPage = false,
  children,
}) => {
  return (
    <a
      href={href}
      target={openInNewPage ? "_blank" : undefined}
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
};

export function InternalHTMLLink(
  href: string,
  text: string,
  className?: string
) {
  if (href.startsWith("#") && PLATFORM === "native") {
    // relative link in the samepage does not work in native mode, so we have to fake it...
    return `<span className="a-fake-href ${className}">${text}</span>`;
  }
  return `<a href="${href}" class="${className}" data-internal-link="true" onClick="${routeAPIs.internalHTMLLinkClickFnId}(event);">${text}</a>`;
}
