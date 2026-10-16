/* Dependency-free fallback UI served when the Vite bundle has not been built.
 * `python scripts/build_frontend.py` regenerates this directory. */
(function () {
  "use strict";

  var DOCS_URL = "https://github.com/binrchq/python-ui-starter";
  var POLL_INTERVAL_MS = 5000;

  var root = document.getElementById("app");
  root.innerHTML = [
    '<header class="topbar">',
    '  <div class="brand"><span class="logo"></span>',
    '    <div><h1>python-ui-starter</h1>',
    '      <p id="subtitle" class="subtitle">initialising…</p></div>',
    "  </div>",
    '  <div class="actions">',
    '    <span id="connection" class="badge">connecting…</span>',
    '    <button id="poll" class="ghost">Poll: off</button>',
    '    <button id="theme" class="ghost">Toggle theme</button>',
    "  </div>",
    "</header>",
    "<main>",
    '  <section class="panel"><h2>Server</h2>',
    '    <div class="buttons">',
    '      <button data-kind="ping">Ping</button>',
    '      <button data-kind="health">Health</button>',
    '      <button data-kind="ready">Ready</button>',
    '      <button data-kind="uuid">UUID</button>',
    "    </div>",
    '    <label class="field"><span>Backend URL</span>',
    '      <input id="server-url" type="text" spellcheck="false" autocomplete="off" /></label>',
    '    <div class="buttons"><button id="server-save" class="ghost">Apply backend URL</button></div>',
    '    <p id="hint" class="hint">Fallback bundle — run <code>npm run build</code> for the full TypeScript UI.</p>',
    "  </section>",
    '  <section class="panel"><h2>Native</h2>',
    '    <div class="buttons">',
    '      <button id="open-file">Open file…</button>',
    '      <button id="save-file">Save file…</button>',
    '      <button id="select-dir">Choose folder…</button>',
    '      <button id="copy">Copy response</button>',
    '      <button id="paste">Read clipboard</button>',
    '      <button id="open-url">Open docs</button>',
    '      <button id="notify">Notify</button>',
    "    </div>",
    '    <p id="native-result" class="hint"></p>',
    "  </section>",
    '  <section class="panel"><h2>Window</h2>',
    '    <div class="buttons">',
    '      <button id="fullscreen">Toggle full screen</button>',
    '      <button id="on-top">Toggle always-on-top</button>',
    '      <button id="reload">Reload frontend</button>',
    "    </div>",
    '    <p id="window-state" class="hint"></p>',
    "  </section>",
    '  <section class="panel"><h2>System</h2><dl id="system" class="info-grid"></dl></section>',
    '  <section class="panel wide"><h2>Response</h2>',
    '    <pre id="response" class="response">No response yet.</pre></section>',
    '  <section class="panel wide"><h2>Event log</h2><ul id="log" class="log"></ul></section>',
    "</main>",
  ].join("\n");

  var els = {
    subtitle: document.getElementById("subtitle"),
    connection: document.getElementById("connection"),
    poll: document.getElementById("poll"),
    theme: document.getElementById("theme"),
    hint: document.getElementById("hint"),
    response: document.getElementById("response"),
    log: document.getElementById("log"),
    serverUrl: document.getElementById("server-url"),
    serverSave: document.getElementById("server-save"),
    nativeResult: document.getElementById("native-result"),
    windowState: document.getElementById("window-state"),
    system: document.getElementById("system"),
  };

  var polling = false;
  var alwaysOnTop = false;

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

  function reportDialog(kind, raw) {
    var result = raw ? JSON.parse(raw) : { ok: false };
    els.nativeResult.textContent = result.ok ? kind + ": " + result.path : kind + ": cancelled";
    if (result.ok) {
      log(kind + ": " + result.path);
    }
  }

  function populateSystem(info) {
    var rows = [
      ["Platform", info.platform + " " + info.release],
      ["Machine", info.machine || "n/a"],
      ["CPU", info.cpuCount + " core(s)"],
      ["Python", info.pythonVersion],
      ["PySide6", info.pysideVersion || "n/a"],
      ["Qt", info.qtVersion || "n/a"],
      ["Memory", info.memoryMb != null ? info.memoryMb + " MB" : "n/a"],
      ["PID", String(info.pid)],
      ["Working dir", info.cwd],
    ];
    els.system.innerHTML = rows
      .map(function (row) {
        return "<dt>" + escapeHtml(row[0]) + "</dt><dd>" + escapeHtml(row[1]) + "</dd>";
      })
      .join("");
  }

  function setConnection(label, modifier) {
    els.connection.textContent = label;
    els.connection.className = "badge " + modifier;
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function attach(bridge) {
    var info = JSON.parse(bridge.appInfo());
    els.subtitle.textContent = info.name + " v" + info.version + " · Qt " + info.qtVersion;
    els.serverUrl.value = info.serverUrl;
    populateSystem(JSON.parse(bridge.systemInfo()));
    document.documentElement.dataset.theme = info.theme;
    document.documentElement.style.setProperty("--accent", info.accent);
    setConnection("connected", "online");

    bridge.serverResponse.connect(render);
    bridge.notification.connect(log);
    bridge.themeChanged.connect(function (theme) {
      document.documentElement.dataset.theme = theme;
      log("theme changed to " + theme);
    });
    bridge.busyChanged.connect(function (busy) {
      els.hint.textContent = busy ? "Calling backend…" : "";
    });
    bridge.connectionChanged.connect(function (online) {
      setConnection(online ? "online" : "offline", online ? "online" : "offline");
    });
    bridge.windowStateChanged.connect(function (raw) {
      var state = JSON.parse(raw);
      alwaysOnTop = state.alwaysOnTop;
      els.windowState.textContent =
        "full screen: " + state.fullScreen + " · always on top: " + state.alwaysOnTop;
    });

    document.querySelectorAll("button[data-kind]").forEach(function (button) {
      button.addEventListener("click", function () {
        bridge["fetch" + capitalize(button.dataset.kind)]();
      });
    });

    els.serverSave.addEventListener("click", function () {
      var url = els.serverUrl.value.trim();
      if (url) {
        bridge.setServerUrl(url);
      }
    });

    document.getElementById("open-file").addEventListener("click", function () {
      reportDialog("open", bridge.openFile(""));
    });
    document.getElementById("save-file").addEventListener("click", function () {
      reportDialog("save", bridge.saveFile(""));
    });
    document.getElementById("select-dir").addEventListener("click", function () {
      reportDialog("folder", bridge.selectDirectory());
    });
    document.getElementById("copy").addEventListener("click", function () {
      bridge.writeClipboard(els.response.textContent || "");
    });
    document.getElementById("paste").addEventListener("click", function () {
      var text = bridge.readClipboard() || "";
      els.nativeResult.textContent = text ? "clipboard: " + text : "clipboard is empty";
      log("clipboard read (" + text.length + " chars)");
    });
    document.getElementById("open-url").addEventListener("click", function () {
      bridge.openUrl(DOCS_URL);
    });
    document.getElementById("notify").addEventListener("click", function () {
      bridge.showNotification("Hello", "from the fallback UI");
    });

    document.getElementById("fullscreen").addEventListener("click", function () {
      bridge.toggleFullScreen();
    });
    document.getElementById("on-top").addEventListener("click", function () {
      alwaysOnTop = !alwaysOnTop;
      bridge.setAlwaysOnTop(alwaysOnTop);
    });
    document.getElementById("reload").addEventListener("click", function () {
      window.location.reload();
    });

    els.poll.addEventListener("click", function () {
      polling = !polling;
      if (polling) {
        bridge.startHealthPolling(POLL_INTERVAL_MS);
      } else {
        bridge.stopHealthPolling();
      }
      els.poll.textContent = "Poll: " + (polling ? "on" : "off");
    });

    els.theme.addEventListener("click", function () {
      var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      bridge.setTheme(next);
    });

    log("bridge ready (in-process ping: " + bridge.ping() + ")");
  }

  function init() {
    if (typeof QWebChannel === "undefined" || !window.qt || !window.qt.webChannelTransport) {
      setConnection("bridge unavailable", "offline");
      log("QWebChannel unavailable — open this page inside Qt WebEngine.");
      return;
    }
    new QWebChannel(window.qt.webChannelTransport, function (channel) {
      attach(channel.objects.bridge);
    });
  }

  init();
})();