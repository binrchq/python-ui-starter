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
    <button id="theme" class="ghost">Toggle theme</button>
  </div>
</header>
<main>
  <section class="panel">
    <h2>Backend actions</h2>
    <div class="buttons">
      <button data-kind="ping">Ping</button>
      <button data-kind="health">Health</button>
      <button data-kind="ready">Ready</button>
      <button data-kind="uuid">UUID</button>
    </div>
    <p id="hint" class="hint"></p>
    <p class="hint">Requires python-server-starter running at the configured URL.</p>
  </section>
  <section class="panel">
    <h2>Response</h2>
    <pre id="response" class="response">No response yet.</pre>
  </section>
  <section class="panel wide">
    <h2>Event log</h2>
    <ul id="log" class="log"></ul>
  </section>
</main>`;