export type Theme = "dark" | "light";

export interface AppInfo {
  name: string;
  version: string;
  serverUrl: string;
  theme: Theme;
  accent: string;
  qtVersion: string;
}

export interface ServerPayload<T = unknown> {
  kind: string;
  ok: boolean;
  data?: T;
  error?: string;
}

export interface Signal<T> {
  connect(handler: (value: T) => void): void;
  disconnect(handler: (value: T) => void): void;
}

/** The Python object registered as `bridge` on the QWebChannel. */
export interface BridgeApi {
  appInfo(): string;
  ping(): string;
  getTheme(): string;
  log(message: string): void;
  setTheme(theme: string): void;
  fetchHealth(): void;
  fetchReady(): void;
  fetchPing(): void;
  fetchUuid(): void;

  notification: Signal<string>;
  themeChanged: Signal<string>;
  serverResponse: Signal<string>;
  busyChanged: Signal<boolean>;
}

export type FetchKind = "health" | "ready" | "ping" | "uuid";