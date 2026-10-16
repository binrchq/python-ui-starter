import { BridgeClient } from "./bridge";
import { MockBridge } from "./mock_bridge";
import { TEMPLATE } from "./template";
import type { DialogResult, FetchKind, ServerPayload, SystemInfo, Theme, WindowState } from "./types";

const DOCS_URL = "https://github.com/binrchq/python-ui-starter";
const POLL_INTERVAL_MS = 5000;

interface Elements {
  subtitle: HTMLElement;
  connection: HTMLElement;
  poll: HTMLButtonElement;
  themeButton: HTMLButtonElement;
  hint: HTMLElement;
  response: HTMLElement;
  log: HTMLElement;
  serverUrl: HTMLInputElement;
  serverSave: HTMLButtonElement;
  nativeResult: HTMLElement;
  windowState: HTMLElement;
  systemList: HTMLElement;
}

/** Presentation + interaction layer. Rendering happens in the constructor. */
export class App {
  private readonly root: HTMLElement;
  private readonly els: Elements;
  private bridge: BridgeClient | null = null;
  private readonly unsubscribers: Array<() => void> = [];
  private polling = false;
  private alwaysOnTop = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.innerHTML = TEMPLATE;
    this.els = {
      subtitle: must<HTMLElement>("subtitle"),
      connection: must<HTMLElement>("connection"),
      poll: must<HTMLButtonElement>("poll"),
      themeButton: must<HTMLButtonElement>("theme"),
      hint: must<HTMLElement>("hint"),
      response: must<HTMLElement>("response"),
      log: must<HTMLElement>("log"),
      serverUrl: must<HTMLInputElement>("server-url"),
      serverSave: must<HTMLButtonElement>("server-save"),
      nativeResult: must<HTMLElement>("native-result"),
      windowState: must<HTMLElement>("window-state"),
      systemList: must<HTMLElement>("system"),
    };

    this.bindServerButtons();
    this.bindNativeButtons();
    this.bindWindowButtons();
    this.bindPolling();
    this.els.themeButton.addEventListener("click", () => this.toggleTheme());
  }

  attach(bridge: BridgeClient): void {
    this.bridge = bridge;

    const info = bridge.info();
    this.els.subtitle.textContent = `${info.name} v${info.version} · Qt ${info.qtVersion}`;
    this.els.serverUrl.value = info.serverUrl;
    this.populateSystem(bridge.systemInfo());
    document.documentElement.dataset.theme = info.theme;
    document.documentElement.style.setProperty("--accent", info.accent);
    this.setConnection("connected", "online");
    this.log(`bridge ready (in-process ping: ${bridge.inProcessPing()})`);

    this.unsubscribers.push(
      bridge.onServerResponse((payload) => this.renderResponse(payload)),
      bridge.onNotification((message) => this.log(message)),
      bridge.onThemeChanged((theme) => this.applyTheme(theme)),
      bridge.onConnectionChanged((online) => this.setConnection(online ? "online" : "offline", online ? "online" : "offline")),
      bridge.onWindowStateChanged((state) => this.applyWindowState(state)),
      bridge.onBusy((busy) => {
        this.els.hint.textContent = busy ? "Calling backend…" : "";
      }),
    );
  }

  attachBrowserFallback(reason: string): void {
    this.setConnection("browser preview", "offline");
    this.attach(new BridgeClient(new MockBridge()));
    this.log(reason);
  }

  detach(): void {
    this.unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  }

  // ------------------------------------------------------------------ //
  // Bindings
  // ------------------------------------------------------------------ //
  private bindServerButtons(): void {
    this.root.querySelectorAll<HTMLButtonElement>("button[data-kind]").forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.dataset.kind as FetchKind;
        this.bridge?.fetch(kind);
        this.els.hint.textContent = `Requesting ${kind}…`;
      });
    });

    this.els.serverSave.addEventListener("click", () => {
      const url = this.els.serverUrl.value.trim();
      if (!url) {
        this.log("backend URL cannot be empty");
        return;
      }
      this.bridge?.setServerUrl(url);
    });
  }

  private bindNativeButtons(): void {
    must<HTMLButtonElement>("open-file").addEventListener("click", () =>
      this.reportDialog("open", this.bridge?.openFile() ?? { ok: false }),
    );
    must<HTMLButtonElement>("save-file").addEventListener("click", () =>
      this.reportDialog("save", this.bridge?.saveFile() ?? { ok: false }),
    );
    must<HTMLButtonElement>("select-dir").addEventListener("click", () =>
      this.reportDialog("folder", this.bridge?.selectDirectory() ?? { ok: false }),
    );
    must<HTMLButtonElement>("copy").addEventListener("click", () => {
      this.bridge?.writeClipboard(this.els.response.textContent ?? "");
    });
    must<HTMLButtonElement>("paste").addEventListener("click", () => {
      const text = this.bridge?.readClipboard() ?? "";
      this.els.nativeResult.textContent = text ? `clipboard: ${text}` : "clipboard is empty";
      this.log(`clipboard read (${text.length} chars)`);
    });
    must<HTMLButtonElement>("open-url").addEventListener("click", () => this.bridge?.openUrl(DOCS_URL));
    must<HTMLButtonElement>("notify").addEventListener("click", () =>
      this.bridge?.showNotification("Hello", "from the TypeScript frontend"),
    );
  }

  private bindWindowButtons(): void {
    must<HTMLButtonElement>("fullscreen").addEventListener("click", () => {
      this.bridge?.toggleFullScreen();
    });
    must<HTMLButtonElement>("on-top").addEventListener("click", () => {
      this.alwaysOnTop = !this.alwaysOnTop;
      this.bridge?.setAlwaysOnTop(this.alwaysOnTop);
    });
    must<HTMLButtonElement>("reload").addEventListener("click", () => window.location.reload());
  }

  private bindPolling(): void {
    this.els.poll.addEventListener("click", () => {
      this.polling = !this.polling;
      if (this.polling) {
        this.bridge?.startHealthPolling(POLL_INTERVAL_MS);
      } else {
        this.bridge?.stopHealthPolling();
      }
      this.els.poll.textContent = `Poll: ${this.polling ? "on" : "off"}`;
    });
  }

  // ------------------------------------------------------------------ //
  // Rendering
  // ------------------------------------------------------------------ //
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

  private applyWindowState(state: WindowState): void {
    this.alwaysOnTop = state.alwaysOnTop;
    this.els.windowState.textContent = `full screen: ${state.fullScreen} · always on top: ${state.alwaysOnTop}`;
  }

  private reportDialog(kind: string, result: DialogResult): void {
    if (result.ok && result.path) {
      this.els.nativeResult.textContent = `${kind}: ${result.path}`;
      this.log(`${kind}: ${result.path}`);
    } else {
      this.els.nativeResult.textContent = `${kind}: cancelled`;
    }
  }

  private renderResponse(payload: ServerPayload): void {
    this.els.response.textContent = JSON.stringify(payload, null, 2);
    this.els.response.dataset.state = payload.ok ? "ok" : "error";
    this.log(`${payload.kind}: ${payload.ok ? "ok" : "error"}`);
  }

  private populateSystem(info: SystemInfo): void {
    const rows: Array<[string, string]> = [
      ["Platform", `${info.platform} ${info.release}`],
      ["Machine", info.machine || "n/a"],
      ["CPU", `${info.cpuCount} core(s)`],
      ["Python", info.pythonVersion],
      ["PySide6", info.pysideVersion ?? "n/a"],
      ["Qt", info.qtVersion ?? "n/a"],
      ["Memory", info.memoryMb != null ? `${info.memoryMb} MB` : "n/a"],
      ["PID", String(info.pid)],
      ["Working dir", info.cwd],
    ];
    this.els.systemList.innerHTML = rows
      .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`)
      .join("");
  }

  private setConnection(label: string, modifier: "online" | "offline"): void {
    this.els.connection.textContent = label;
    this.els.connection.className = `badge ${modifier}`;
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