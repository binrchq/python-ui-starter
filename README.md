# python-ui-starter

A production-grade **Qt6 (PySide6)** desktop scaffold with an **embedded TypeScript frontend** bridged over **QWebChannel** — the Python counterpart to [`binrchq/go-starter`](https://github.com/binrchq/go-starter) and a companion to [`binrchq/python-server-starter`](https://github.com/binrchq/python-server-starter).

The Python process owns the window, native capabilities, and configuration. The
TypeScript frontend owns presentation and runs inside Qt WebEngine; the two talk
through a typed, promise-friendly bridge.

---

## 📚 Documentation

| Guide | Description |
| :--- | :--- |
| [**`docs/tutorial.md`**](./docs/tutorial.md) | Add bridge methods, extend the UI, theme, and package the app |

---

## 🌟 Key Features

- **Qt6 / PySide6 host** with `QWebEngineView` as the central widget.
- **Embedded TypeScript + Vite frontend** built straight into `app/resources/web`.
- **Custom `app://` scheme handler** — secure origin, ES-module support, no local HTTP server required.
- **Typed QWebChannel bridge** exposing Python `@Slot`s and `Signal`s, with a TypeScript wrapper that returns promises.
- **Native desktop capabilities** — file/folder dialogs, clipboard, open external URL, always-on-top / full-screen, system info, and persisted settings (`QSettings`).
- **Backend integration** — typed health/ready/ping/uuid helpers plus a generic `request(method, path, body)`, all off the UI thread, with optional health polling.
- **Native menu bar & shortcuts** (File / View / Help) and window geometry persistence.
- **Dependency-free fallback bundle** so the app runs immediately, before Node is installed.
- **Vite dev-server mode** (`--dev`) for hot reload during frontend development.
- **Layered, testable structure**: `config` → `services` → `bridge` → `window` → `view`.

---

## 🏗️ Architecture Overview

```text
┌──────────────────────────────────────────────────────────────┐
│                        Qt Application                        │
│  ┌────────────────────────┐      ┌────────────────────────┐  │
│  │   Python (PySide6)     │      │  Qt WebEngine          │  │
│  │                        │      │                        │  │
│  │  AppBridge  ◄──QWebChannel──► │  TypeScript frontend   │  │
│  │  ApiClient  ──HTTP──► server   │  (Vite bundle)         │  │
│  │  Config / Logging      │      │  app://bundle/index    │  │
│  └────────────────────────┘      └────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                     │ HTTP (httpx)
                     ▼
        python-server-starter  (FastAPI, :8000)
```

```text
python-ui-starter/
├── app/
│   ├── main.py                 # Entrypoint: QApplication + window
│   ├── config.py               # pydantic-settings configuration
│   ├── log.py                  # stdlib logging setup
│   ├── services/
│   │   └── api_client.py       # httpx client for the backend
│   ├── window/
│   │   ├── bridge.py           # QWebChannel AppBridge (Slots + Signals)
│   │   └── main_window.py      # QMainWindow hosting the web view
│   ├── view/
│   │   └── webview.py          # QWebEngineView + app:// scheme handler
│   └── resources/web/          # Built frontend assets (fallback included)
├── frontend/                   # TypeScript + Vite source
│   ├── index.html
│   ├── src/{main,app,bridge,types}.ts
│   └── vite.config.ts
├── scripts/build_frontend.py   # npm install + vite build
└── tests/                      # pytest suite
```

---

## 🚀 Quick Start

### 1. Install the Python host
```bash
make venv install      # or: python -m venv .venv && .venv/Scripts/pip install -e ".[dev]"
```

> PySide6 currently supports Python 3.10–3.13.

### 2. Run immediately (bundled fallback UI)
```bash
python -m app
```
The dependency-free fallback in `app/resources/web` is served over `app://`.
Start `python-server-starter` first to exercise the backend buttons.

### 3. Build the full TypeScript UI
```bash
make frontend-install
make frontend-build    # -> app/resources/web (Vite output)
python -m app
```

### 4. Frontend hot-reload development
```bash
make dev               # terminal 1: Vite on http://localhost:5173
make run-dev           # terminal 2: Qt loads the dev server
```

---

## ⚙️ Configuration

`config.yaml` (overridable via `UI__` environment variables):

```yaml
server:
  url: http://127.0.0.1:8000
  timeout: 5.0
frontend:
  dev_url: null         # e.g. http://localhost:5173
window:
  title: python-ui-starter
  width: 1200
  height: 800
ui:
  theme: dark           # dark | light
  accent: "#7c5cff"
```

| Flag | Description |
| :--- | :--- |
| `--config/-c PATH` | Configuration file |
| `--dev` | Load the Vite dev server instead of bundled assets |
| `--dev-url URL` | Dev server URL (default `http://localhost:5173`) |
| `--log-level LEVEL` | `debug` \| `info` \| `warning` \| `error` |

---

## 🔌 Bridge API

Registered as the `bridge` object on the QWebChannel. See
`app/window/bridge.py` and `frontend/src/bridge.ts`.

### Slots (JS → Python)

| Member | Returns | Description |
| :--- | :--- | :--- |
| `appInfo()` | JSON | name, version, server URL, theme, Qt version |
| `systemInfo()` | JSON | platform, CPU, Python/Qt versions, PID, cwd, memory |
| `ping()` | `"pong"` | In-process liveness check |
| `getTheme()` / `setTheme(theme)` | — | Read / switch theme (`dark` / `light`) |
| `getSetting(key)` / `setSetting(k, v)` | `string` | Persisted settings via `QSettings` |
| `readClipboard()` / `writeClipboard(text)` | `string` | Clipboard access |
| `openFile(filters)` / `saveFile(name)` / `selectDirectory()` | JSON `{ok, path}` | Native dialogs |
| `openUrl(url)` | — | Open an http(s)/mailto URL externally |
| `setServerUrl(url)` | — | Repoint the backend client at runtime |
| `showNotification(title, message)` | — | Emit a user-facing notification |
| `log(message)` | — | Log a frontend message |
| `isFullScreen()` / `setFullScreen(b)` / `toggleFullScreen()` | `bool` | Window control |
| `setAlwaysOnTop(b)` | — | Window control |
| `fetchHealth()` / `fetchReady()` / `fetchPing()` / `fetchUuid()` | — | Typed backend calls (off-thread) |
| `request(method, path, payloadJson)` | — | Generic backend call |
| `startHealthPolling(ms)` / `stopHealthPolling()` | — | Connection watchdog |

### Signals (Python → JS)

| Signal | Payload | Description |
| :--- | :--- | :--- |
| `notification` | `string` | User-facing notification text |
| `serverResponse` | `string` | JSON payload for a backend call |
| `themeChanged` | `string` | Theme was changed |
| `busyChanged` | `bool` | Backend request in flight |
| `connectionChanged` | `bool` | Health poll result |
| `windowStateChanged` | `string` | JSON `{fullScreen, alwaysOnTop}` |

```ts
const bridge = await initBridge();
bridge.showNotification("Hello", "from the UI");
bridge.fetch("health");
bridge.request("GET", "/api/public/time");
const picked = bridge.openFile("Images (*.png *.jpg);;All (*)");
bridge.onServerResponse((payload) => console.log(payload));
```

---

## 🧪 Testing

```bash
make test     # pytest (bridge tests skip when PySide6 is absent)
make lint     # ruff
```

---

## 📦 Packaging

```bash
make frontend-build
make package          # PyInstaller -> dist/python-ui-starter
```

---

## License

[MIT](./LICENSE) © 2026 BINRC. See the LICENSE file for the Qt `qwebchannel.js` notice.