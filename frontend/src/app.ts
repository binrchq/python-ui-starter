import { BridgeClient } from "./bridge";
import { MockBridge } from "./mock_bridge";
import { TEMPLATE } from "./template";
import type { FetchKind, ServerPayload, Theme } from "./types";

/** Presentation + interaction layer. Rendering happens in the constructor. */
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

  detach(): void {
    this.unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  }

  private toggleTheme(): void {
    const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
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
    this.els.response.textContent = JSON.stringify(payload, null, 2);
    this.els.response.dataset.state = payload.ok ? "ok" : "error";
    this.log(`${payload.kind}: ${payload.ok ? "ok" : "error"}`);
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
  return value.replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char,
  );
}