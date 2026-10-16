/** Static markup for the application shell. */
export const TEMPLATE = `
<header class="topbar">
  <div class="brand">
    <span class="logo"></span>
    <div>
      <h1>python-ui-starter</h1>
      <p id="subtitle" class="subtitle">initialising…</p>
    </div>
  </div>
  <div class="actions">
    <span id="connection" class="badge">connecting…</span>
    <button id="poll" class="ghost">Poll: off</button>
    <button id="theme" class="ghost">Toggle theme</button>
  </div>
</header>
<main>
  <section class="panel">
    <h2>Server</h2>
    <div class="buttons">
      <button data-kind="ping">Ping</button>
      <button data-kind="health">Health</button>
      <button data-kind="ready">Ready</button>
      <button data-kind="uuid">UUID</button>
    </div>
    <label class="field">
      <span>Backend URL</span>
      <input id="server-url" type="text" spellcheck="false" autocomplete="off" />
    </label>
    <div class="buttons">
      <button id="server-save" class="ghost">Apply backend URL</button>
    </div>
    <p id="hint" class="hint"></p>
  </section>

  <section class="panel">
    <h2>Native</h2>
    <div class="buttons">
      <button id="open-file">Open file…</button>
      <button id="save-file">Save file…</button>
      <button id="select-dir">Choose folder…</button>
      <button id="copy">Copy response</button>
      <button id="paste">Read clipboard</button>
      <button id="open-url">Open docs</button>
      <button id="notify">Notify</button>
    </div>
    <p id="native-result" class="hint"></p>
  </section>

  <section class="panel">
    <h2>Window</h2>
    <div class="buttons">
      <button id="fullscreen">Toggle full screen</button>
      <button id="on-top">Toggle always-on-top</button>
      <button id="reload">Reload frontend</button>
    </div>
    <p id="window-state" class="hint"></p>
  </section>

  <section class="panel">
    <h2>System</h2>
    <dl id="system" class="info-grid"></dl>
  </section>

  <section class="panel wide">
    <h2>Response</h2>
    <pre id="response" class="response">No response yet.</pre>
  </section>

  <section class="panel wide">
    <h2>Event log</h2>
    <ul id="log" class="log"></ul>
  </section>
</main>`;