import { Location } from "history";
import { matchPath } from "react-router";
import HomePage from "../pages/HomePage";
import ProjectPage from "../pages/ProjectPage";
import TablePage from "../pages/TablePage";
import { NoArgsPathDef, NoQueryArgsPathDef, PathDef } from "./route";
export { ExternalLink, InternalHTMLLink, InternalLink } from "./Link";
export { history, PathDef, routeAPIs } from "./route";

/*************************************************************************************
 * Definitions for routes in this application
 */
export type RouteURLArgs_project = { projectId: string };
export type RouteURLArgs_table = { tableId: string };
export type RouteQueryArgs_table = { query?: string };

export const RouteConf = {
  project: new NoQueryArgsPathDef<RouteURLArgs_project>(
    ProjectPage,
    "/projects/:projectId"
  ),
  table: new PathDef<RouteURLArgs_table, RouteQueryArgs_table>(
    TablePage,
    "/tables/:tableId"
  ),
  home: new NoArgsPathDef(HomePage, "/", true),
};
(window as any)._RouteConf = RouteConf;

/*************************************************************************************
 * Find the route that matches with the current location
 */
export function getActiveRouteName(
  location: Location<any>
): string | undefined {
  for (let [name, route] of Object.entries(RouteConf)) {
    if (matchPath(location.pathname, route.routeDef) !== null) {
      return name;
    }
  }
}
