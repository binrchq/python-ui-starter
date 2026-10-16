import "./style.css";

import { App } from "./app";
import { hasQtTransport, initBridge } from "./bridge";

const root = document.getElementById("app");
if (!root) {
  throw new Error("#app container is missing");
}

// The App constructor renders the initial DOM; the bridge is attached async.
const app = new App(root);

if (hasQtTransport()) {
  initBridge()
    .then((bridge) => app.attach(bridge))
    .catch((error: Error) => app.attachBrowserFallback(error.message));
} else {
  app.attachBrowserFallback("Running in a browser without a Qt web channel transport.");
}