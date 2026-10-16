import { QWebChannel } from "qwebchannel";

import type {
  AppInfo,
  BridgeApi,
  DialogResult,
  FetchKind,
  ServerPayload,
  Signal,
  SystemInfo,
  Theme,
  WindowState,
} from "./types";

export type Unsubscribe = () => void;

/** Ergonomic, typed wrapper around the raw QWebChannel bridge object. */
export class BridgeClient {
  constructor(readonly api: BridgeApi) {}

  // Introspection ------------------------------------------------------- //
  info(): AppInfo {
    return JSON.parse(this.api.appInfo()) as AppInfo;
  }

  systemInfo(): SystemInfo {
    return JSON.parse(this.api.systemInfo()) as SystemInfo;
  }

  inProcessPing(): string {
    return this.api.ping();
  }

  theme(): Theme {
    return this.api.getTheme() as Theme;
  }

  isFullScreen(): boolean {
    return this.api.isFullScreen();
  }

  // Commands ------------------------------------------------------------ //
  notify(message: string): void {
    this.api.log(message);
  }

  setTheme(theme: Theme): void {
    this.api.setTheme(theme);
  }

  setServerUrl(url: string): void {
    this.api.setServerUrl(url);
  }

  readClipboard(): string {
    return this.api.readClipboard();
  }

  writeClipboard(text: string): void {
    this.api.writeClipboard(text);
  }

  showNotification(title: string, message: string): void {
    this.api.showNotification(title, message);
  }

  openUrl(url: string): void {
    this.api.openUrl(url);
  }

  getSetting(key: string): string {
    return this.api.getSetting(key);
  }

  setSetting(key: string, value: string): void {
    this.api.setSetting(key, value);
  }

  // Window -------------------------------------------------------------- //
  setFullScreen(enabled: boolean): void {
    this.api.setFullScreen(enabled);
  }

  toggleFullScreen(): boolean {
    return this.api.toggleFullScreen();
  }

  setAlwaysOnTop(enabled: boolean): void {
    this.api.setAlwaysOnTop(enabled);
  }

  // Native dialogs ------------------------------------------------------ //
  openFile(filters = ""): DialogResult {
    return JSON.parse(this.api.openFile(filters)) as DialogResult;
  }

  saveFile(defaultName = ""): DialogResult {
    return JSON.parse(this.api.saveFile(defaultName)) as DialogResult;
  }

  selectDirectory(): DialogResult {
    return JSON.parse(this.api.selectDirectory()) as DialogResult;
  }

  // Backend ------------------------------------------------------------- //
  fetch(kind: FetchKind): void {
    const handlers: Record<FetchKind, () => void> = {
      health: () => this.api.fetchHealth(),
      ready: () => this.api.fetchReady(),
      ping: () => this.api.fetchPing(),
      uuid: () => this.api.fetchUuid(),
    };
    handlers[kind]();
  }

  request(method: string, path: string, payload?: unknown): void {
    this.api.request(method, path, payload === undefined ? "" : JSON.stringify(payload));
  }

  startHealthPolling(intervalMs: number): void {
    this.api.startHealthPolling(intervalMs);
  }

  stopHealthPolling(): void {
    this.api.stopHealthPolling();
  }

  // Signals ------------------------------------------------------------- //
  onNotification(handler: (message: string) => void): Unsubscribe {
    return subscribe(this.api.notification, handler);
  }

  onThemeChanged(handler: (theme: Theme) => void): Unsubscribe {
    return subscribe(this.api.themeChanged, (value) => handler(value as Theme));
  }

  onServerResponse(handler: (payload: ServerPayload) => void): Unsubscribe {
    return subscribe(this.api.serverResponse, (raw) => handler(JSON.parse(raw) as ServerPayload));
  }

  onBusy(handler: (busy: boolean) => void): Unsubscribe {
    return subscribe(this.api.busyChanged, handler);
  }

  onConnectionChanged(handler: (online: boolean) => void): Unsubscribe {
    return subscribe(this.api.connectionChanged, handler);
  }

  onWindowStateChanged(handler: (state: WindowState) => void): Unsubscribe {
    return subscribe(this.api.windowStateChanged, (raw) =>
      handler(JSON.parse(raw) as WindowState),
    );
  }
}

function subscribe<T>(signal: Signal<T>, handler: (value: T) => void): Unsubscribe {
  signal.connect(handler);
  return () => signal.disconnect(handler);
}

export function hasQtTransport(): boolean {
  const qt = (window as unknown as { qt?: { webChannelTransport?: unknown } }).qt;
  return Boolean(qt && qt.webChannelTransport);
}

/** Resolve the bridge once the QWebChannel handshake completes. */
export function initBridge(): Promise<BridgeClient> {
  return new Promise((resolve, reject) => {
    const qt = (window as unknown as { qt?: { webChannelTransport?: unknown } }).qt;
    if (!qt?.webChannelTransport) {
      reject(new Error("QWebChannel transport unavailable; running outside Qt."));
      return;
    }
    new QWebChannel(qt.webChannelTransport, (channel) => {
      const bridge = channel.objects.bridge as BridgeApi | undefined;
      if (!bridge) {
        reject(new Error("bridge object was not registered on the channel"));
        return;
      }
      resolve(new BridgeClient(bridge));
    });
  });
}