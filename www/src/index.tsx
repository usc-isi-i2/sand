import ReactDOM from "react-dom";
import "./index.css";
import { App } from "rma-baseapp";
import reportWebVitals from "./reportWebVitals";
import { stores, initStores, StoreContext } from "./models";
import { routes } from "./routes";

initStores().then(() => {
  ReactDOM.render(
    <StoreContext.Provider value={stores}>
      <App enUSLocale={true} routes={routes} />
    </StoreContext.Provider>,
    document.getElementById("root")
  );
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
