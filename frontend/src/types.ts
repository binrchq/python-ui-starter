export type Theme = "dark" | "light";

export interface AppInfo {
  name: string;
  version: string;
  serverUrl: string;
  theme: Theme;
  accent: string;
  qtVersion: string;
}

export interface SystemInfo {
  platform: string;
  release: string;
  machine: string;
  processor: string;
  pythonVersion: string;
  pythonExecutable: string;
  cpuCount: number;
  pid: number;
  cwd: string;
  pysideVersion: string | null;
  qtVersion: string | null;
  memoryMb: number | null;
}

export interface DialogResult {
  ok: boolean;
  path?: string;
}

export interface WindowState {
  fullScreen: boolean;
  alwaysOnTop: boolean;
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
  // Introspection
  appInfo(): string;
  ping(): string;
  getTheme(): string;
  systemInfo(): string;
  readClipboard(): string;
  isFullScreen(): boolean;
  getSetting(key: string): string;

  // Commands
  log(message: string): void;
  setTheme(theme: string): void;
  setSetting(key: string, value: string): void;
  writeClipboard(text: string): void;
  showNotification(title: string, message: string): void;
  openUrl(url: string): void;
  setServerUrl(url: string): void;

  // Window control
  setAlwaysOnTop(enabled: boolean): void;
  setFullScreen(enabled: boolean): void;
  toggleFullScreen(): boolean;

  // Native dialogs
  openFile(filters: string): string;
  saveFile(defaultName: string): string;
  selectDirectory(): string;

  // Backend
  fetchHealth(): void;
  fetchReady(): void;
  fetchPing(): void;
  fetchUuid(): void;
  request(method: string, path: string, payloadJson: string): void;
  startHealthPolling(intervalMs: number): void;
  stopHealthPolling(): void;

  // Signals
  notification: Signal<string>;
  themeChanged: Signal<string>;
  serverResponse: Signal<string>;
  busyChanged: Signal<boolean>;
  connectionChanged: Signal<boolean>;
  windowStateChanged: Signal<string>;
}

export type FetchKind = "health" | "ready" | "ping" | "uuid";