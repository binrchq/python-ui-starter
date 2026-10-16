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