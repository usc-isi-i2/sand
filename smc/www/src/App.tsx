import { ConfigProvider } from "antd";
import { Router, Switch, Route } from "react-router-dom";
import "./App.css";
import NotFound404 from "./pages/NotFound404";
import { RouteConf, history } from "./routing";
import enUSIntl from "antd/lib/locale/en_US";

export default function App() {
  return (
    <Router history={history}>
      <ConfigProvider locale={enUSIntl}>
        <div className="app-body">
          <Switch>
            {Object.entries(RouteConf).map(([key, route]) => (
              <Route key={key} {...route.routeDef} />
            ))}
            <Route component={NotFound404} />
          </Switch>
        </div>
      </ConfigProvider>
    </Router>
  );
}
