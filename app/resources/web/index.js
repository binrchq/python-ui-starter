/* Dependency-free fallback UI served when the Vite bundle has not been built.
 * `python scripts/build_frontend.py` regenerates this directory. */
(function () {
  "use strict";

  var root = document.getElementById("app");
  root.innerHTML = [
    '<header class="topbar">',
    '  <div class="brand"><span class="logo"></span>',
    '    <div><h1>python-ui-starter</h1>',
    '      <p id="subtitle" class="subtitle">initialising…</p></div>',
    '  </div>',
    '  <div class="actions">',
    '    <span id="connection" class="badge">connecting…</span>',
    '    <button id="theme" class="ghost">Toggle theme</button>',
    '  </div>',
    "</header>",
    "<main>",
    '  <section class="panel"><h2>Backend actions</h2>',
    '    <div class="buttons">',
    '      <button data-kind="ping">Ping</button>',
    '      <button data-kind="health">Health</button>',
    '      <button data-kind="ready">Ready</button>',
    '      <button data-kind="uuid">UUID</button>',
    "    </div>",
    '    <p id="hint" class="hint"></p>',
    '    <p class="hint">Fallback bundle — run <code>npm run build</code> for the full TypeScript UI.</p>',
    "  </section>",
    '  <section class="panel"><h2>Response</h2>',
    '    <pre id="response" class="response">No response yet.</pre></section>',
    '  <section class="panel wide"><h2>Event log</h2>',
    '    <ul id="log" class="log"></ul></section>',
    "</main>",
  ].join("\n");

  var els = {
    subtitle: document.getElementById("subtitle"),
    connection: document.getElementById("connection"),
    theme: document.getElementById("theme"),
    hint: document.getElementById("hint"),
    response: document.getElementById("response"),
    log: document.getElementById("log"),
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char];
    });
  }

  function log(message) {
    var item = document.createElement("li");
    item.innerHTML =
      '<span class="time">' + new Date().toLocaleTimeString() + "</span> " + escapeHtml(message);
    els.log.prepend(item);
    while (els.log.childElementCount > 100) {
      els.log.lastElementChild.remove();
    }
  }

  function render(payload) {
    els.response.textContent = JSON.stringify(payload, null, 2);
    els.response.dataset.state = payload.ok ? "ok" : "error";
    log(payload.kind + ": " + (payload.ok ? "ok" : "error"));
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function attach(bridge) {
    var info = JSON.parse(bridge.appInfo());
    els.subtitle.textContent = info.name + " v" + info.version + " · Qt " + info.qtVersion;
    document.documentElement.dataset.theme = info.theme;
    document.documentElement.style.setProperty("--accent", info.accent);
    els.connection.textContent = "connected";
    els.connection.className = "badge online";

    bridge.serverResponse.connect(render);
    bridge.notification.connect(log);
    bridge.themeChanged.connect(function (theme) {
      document.documentElement.dataset.theme = theme;
      log("theme changed to " + theme);
    });
    bridge.busyChanged.connect(function (busy) {
      els.hint.textContent = busy ? "Calling backend…" : "";
    });

    document.querySelectorAll("button[data-kind]").forEach(function (button) {
      button.addEventListener("click", function () {
        bridge["fetch" + capitalize(button.dataset.kind)]();
      });
    });
    els.theme.addEventListener("click", function () {
      var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      bridge.setTheme(next);
    });
    log("bridge ready (in-process ping: " + bridge.ping() + ")");
  }

  function init() {
    if (typeof QWebChannel === "undefined" || !window.qt || !window.qt.webChannelTransport) {
      els.connection.textContent = "bridge unavailable";
      els.connection.className = "badge offline";
      log("QWebChannel unavailable — open this page inside Qt WebEngine.");
      return;
    }
    new QWebChannel(window.qt.webChannelTransport, function (channel) {
      attach(channel.objects.bridge);
    });
  }

  init();
})();