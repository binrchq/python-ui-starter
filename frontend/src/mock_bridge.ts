import type { BridgeApi, Signal, Theme } from "./types";

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
  private readonly connectionEmitter = emitter<boolean>();
  private readonly windowStateEmitter = emitter<string>();

  readonly notification = this.notificationEmitter.signal;
  readonly themeChanged = this.themeEmitter.signal;
  readonly serverResponse = this.responseEmitter.signal;
  readonly busyChanged = this.busyEmitter.signal;
  readonly connectionChanged = this.connectionEmitter.signal;
  readonly windowStateChanged = this.windowStateEmitter.signal;

  private baseUrl = "http://127.0.0.1:8000";
  private theme: Theme = "dark";
  private clipboard = "";
  private alwaysOnTop = false;
  private fullScreen = false;
  private pollHandle: number | null = null;

  appInfo(): string {
    return JSON.stringify({
      name: "python-ui-starter",
      version: "0.1.0 (mock)",
      serverUrl: this.baseUrl,
      theme: this.theme,
      accent: "#7c5cff",
      qtVersion: "browser",
    });
  }

  systemInfo(): string {
    return JSON.stringify({
      platform: navigator.platform || "browser",
      release: navigator.userAgent,
      machine: "browser",
      processor: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} cores` : "n/a",
      pythonVersion: "n/a",
      pythonExecutable: "n/a",
      cpuCount: navigator.hardwareConcurrency ?? 1,
      pid: 0,
      cwd: "/",
      pysideVersion: null,
      qtVersion: null,
      memoryMb: null,
    });
  }

  ping(): string {
    return "pong";
  }

  getTheme(): string {
    return this.theme;
  }

  readClipboard(): string {
    return this.clipboard;
  }

  isFullScreen(): boolean {
    return this.fullScreen;
  }

  getSetting(): string {
    return "";
  }

  setSetting(): void {
    /* no persistence in the browser preview */
  }

  log(message: string): void {
    this.notificationEmitter.emit(`[mock] ${message}`);
  }

  setTheme(theme: string): void {
    this.theme = theme as Theme;
    this.themeEmitter.emit(theme);
  }

  writeClipboard(text: string): void {
    this.clipboard = text;
    this.notificationEmitter.emit("[mock] copied to clipboard");
  }

  showNotification(title: string, message: string): void {
    this.notificationEmitter.emit(`${title}: ${message}`);
  }

  openUrl(url: string): void {
    this.notificationEmitter.emit(`[mock] would open ${url}`);
  }

  setServerUrl(url: string): void {
    this.baseUrl = url;
    this.notificationEmitter.emit(`[mock] backend set to ${url}`);
  }

  setAlwaysOnTop(enabled: boolean): void {
    this.alwaysOnTop = enabled;
    this.emitWindowState();
  }

  setFullScreen(enabled: boolean): void {
    this.fullScreen = enabled;
    this.emitWindowState();
  }

  toggleFullScreen(): boolean {
    this.setFullScreen(!this.fullScreen);
    return this.fullScreen;
  }

  openFile(): string {
    this.notificationEmitter.emit("[mock] file dialogs are unavailable in the browser");
    return JSON.stringify({ ok: false, path: "" });
  }

  saveFile(): string {
    this.notificationEmitter.emit("[mock] file dialogs are unavailable in the browser");
    return JSON.stringify({ ok: false, path: "" });
  }

  selectDirectory(): string {
    this.notificationEmitter.emit("[mock] file dialogs are unavailable in the browser");
    return JSON.stringify({ ok: false, path: "" });
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

  request(method: string, path: string, payloadJson: string): void {
    this.respond("request", {
      method,
      path,
      payload: payloadJson ? JSON.parse(payloadJson) : null,
    });
  }

  startHealthPolling(intervalMs: number): void {
    this.stopHealthPolling();
    this.connectionEmitter.emit(true);
    this.pollHandle = window.setInterval(() => this.connectionEmitter.emit(true), Math.max(intervalMs, 500));
  }

  stopHealthPolling(): void {
    if (this.pollHandle !== null) {
      window.clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  private emitWindowState(): void {
    this.windowStateEmitter.emit(
      JSON.stringify({ fullScreen: this.fullScreen, alwaysOnTop: this.alwaysOnTop }),
    );
  }

  private respond(kind: string, data: unknown): void {
    this.busyEmitter.emit(true);
    window.setTimeout(() => {
      this.responseEmitter.emit(JSON.stringify({ kind, ok: true, data }));
      this.busyEmitter.emit(false);
    }, 250);
  }
}