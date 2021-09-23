import React from "react";
import { Button } from "antd";
import { routeAPIs, RouteConf } from "../routing";

const NotFound404: React.FunctionComponent<{}> = () => {
  return (
    <div style={{ textAlign: "center" }}>
      <h1>404 Resource Not Found</h1>
      <div>
        <Button type="link" size="large" onClick={routeAPIs.goBack}>
          Go Back
        </Button>
        <Button
          type="link"
          size="large"
          onClick={RouteConf.home.path().mouseClickNavigationHandler}
        >
          Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound404;