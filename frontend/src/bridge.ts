import { QWebChannel } from "qwebchannel";

import type { AppInfo, BridgeApi, FetchKind, ServerPayload, Signal, Theme } from "./types";

/** Ergonomic, typed wrapper around the raw QWebChannel bridge object. */
export class BridgeClient {
  constructor(readonly api: BridgeApi) {}

  info(): AppInfo {
    return JSON.parse(this.api.appInfo()) as AppInfo;
  }

  inProcessPing(): string {
    return this.api.ping();
  }

  theme(): Theme {
    return this.api.getTheme() as Theme;
  }

  setTheme(theme: Theme): void {
    this.api.setTheme(theme);
  }

  notify(message: string): void {
    this.api.log(message);
  }

  fetch(kind: FetchKind): void {
    const handlers: Record<FetchKind, () => void> = {
      health: () => this.api.fetchHealth(),
      ready: () => this.api.fetchReady(),
      ping: () => this.api.fetchPing(),
      uuid: () => this.api.fetchUuid(),
    };
    handlers[kind]();
  }

  onNotification(handler: (message: string) => void): () => void {
    return subscribe(this.api.notification, handler);
  }

  onThemeChanged(handler: (theme: Theme) => void): () => void {
    return subscribe(this.api.themeChanged, (value) => handler(value as Theme));
  }

  onServerResponse(handler: (payload: ServerPayload) => void): () => void {
    return subscribe(this.api.serverResponse, (raw) => handler(JSON.parse(raw) as ServerPayload));
  }

  onBusy(handler: (busy: boolean) => void): () => void {
    return subscribe(this.api.busyChanged, handler);
  }
}

function subscribe<T>(signal: Signal<T>, handler: (value: T) => void): () => void {
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