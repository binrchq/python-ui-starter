import { BridgeClient } from "./bridge";
import type { BridgeApi, FetchKind, ServerPayload, Signal, Theme } from "./types";

function emitter<T>(): { signal: Signal<T>; emit: (value: T) => void } {
  const handlers = new Set<(value: T) => void>();
  return {
    signal: {
      connect: (handler) => void handlers.add(handler),
      disconnect: (handler) => void handlers.delete(handler),
    },
    emit: (value) => handlers.forEach((handler) => handler(value)),
  };
}

/**
 * In-browser stand-in used by `npm run dev` (no Qt transport available).
 * Mirrors the Python bridge surface so the UI can be developed in a browser.
 */
export class MockBridge implements BridgeApi {
  private readonly notificationEmitter = emitter<string>();
  private readonly themeEmitter = emitter<string>();
  private readonly responseEmitter = emitter<string>();
  private readonly busyEmitter = emitter<boolean>();
  private theme: Theme = "dark";

  readonly notification = this.notificationEmitter.signal;
  readonly themeChanged = this.themeEmitter.signal;
  readonly serverResponse = this.responseEmitter.signal;
  readonly busyChanged = this.busyEmitter.signal;

  appInfo(): string {
    return JSON.stringify({
      name: "python-ui-starter",
      version: "0.1.0 (mock)",
      serverUrl: "http://127.0.0.1:8000",
      theme: this.theme,
      accent: "#7c5cff",
      qtVersion: "browser",
    });
  }

  ping(): string {
    return "pong";
  }

  getTheme(): string {
    return this.theme;
  }

  log(message: string): void {
    this.notificationEmitter.emit(`[mock] ${message}`);
  }

  setTheme(theme: string): void {
    this.theme = theme as Theme;
    this.themeEmitter.emit(theme);
  }

  fetchHealth(): void {
    this.respond("health", { status: "healthy" });
  }

  fetchReady(): void {
    this.respond("ready", { status: "ready", checks: { database: "up" } });
  }

  fetchPing(): void {
    this.respond("ping", { message: "pong" });
  }

  fetchUuid(): void {
    this.respond("uuid", { uuid: crypto.randomUUID() });
  }

  private respond(kind: string, data: unknown): void {
    this.busyEmitter.emit(true);
    window.setTimeout(() => {
      this.responseEmitter.emit(JSON.stringify({ kind, ok: true, data }));
      this.busyEmitter.emit(false);
    }, 250);
  }
}

export class App {
  private readonly root: HTMLElement;
  private bridge: BridgeClient | null = null;
  private readonly unsubscribers: Array<() => void> = [];
  private readonly els: {
    subtitle: HTMLElement;
    connection: HTMLElement;
    themeButton: HTMLButtonElement;
    hint: HTMLElement;
    response: HTMLElement;
    log: HTMLElement;
  };

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.innerHTML = TEMPLATE;
    this.els = {
      subtitle: must<HTMLElement>("subtitle"),
      connection: must<HTMLElement>("connection"),
      themeButton: must<HTMLButtonElement>("theme"),
      hint: must<HTMLElement>("hint"),
      response: must<HTMLElement>("response"),
      log: must<HTMLElement>("log"),
    };

    this.root.querySelectorAll<HTMLButtonElement>("button[data-kind]").forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.dataset.kind as FetchKind;
        this.bridge?.fetch(kind);
        this.els.hint.textContent = `Requesting ${kind}…`;
      });
    });
    this.els.themeButton.addEventListener("click", () => this.toggleTheme());
  }

  attach(bridge: BridgeClient): void {
    this.bridge = bridge;

    const info = bridge.info();
    this.els.subtitle.textContent = `${info.name} v${info.version} · Qt ${info.qtVersion} · ${info.serverUrl}`;
    document.documentElement.dataset.theme = info.theme;
    document.documentElement.style.setProperty("--accent", info.accent);
    this.els.connection.textContent = "connected";
    this.els.connection.className = "badge online";
    this.log(`bridge ready (in-process ping: ${bridge.inProcessPing()})`);

    this.unsubscribers.push(
      bridge.onServerResponse((payload) => this.renderResponse(payload)),
      bridge.onNotification((message) => this.log(message)),
      bridge.onThemeChanged((theme) => this.applyTheme(theme)),
      bridge.onBusy((busy) => {
        this.els.hint.textContent = busy ? "Calling backend…" : "";
      }),
    );
  }

  attachBrowserFallback(reason: string): void {
    this.els.connection.textContent = "browser preview";
    this.els.connection.className = "badge offline";
    this.attach(new BridgeClient(new MockBridge()));
    this.log(reason);
  }

  private toggleTheme(): void {
    const next: Theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    if (this.bridge) {
      this.bridge.setTheme(next);
    } else {
      this.applyTheme(next);
    }
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.dataset.theme = theme;
    this.log(`theme changed to ${theme}`);
  }

  private renderResponse(payload: ServerPayload): void {
    const label = payload.ok ? "ok" : "error";
    this.els.response.textContent = JSON.stringify(payload, null, 2);
    this.els.response.dataset.state = label;
    this.log(`${payload.kind}: ${label}`);
  }

  private log(message: string): void {
    const item = document.createElement("li");
    const time = new Date().toLocaleTimeString();
    item.innerHTML = `<span class="time">${time}</span> ${escapeHtml(message)}`;
    this.els.log.prepend(item);
    while (this.els.log.childElementCount > 100) {
      this.els.log.lastElementChild?.remove();
    }
  }
}

function must<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`missing element #${id}`);
  }
  return element as T;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char,
  );
}

const TEMPLATE = `
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