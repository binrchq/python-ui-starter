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
- **Non-blocking backend calls** — requests to `python-server-starter` run on a worker thread and stream results back via signals.
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

| Direction | Member | Description |
| :--- | :--- | :--- |
| JS → Python (slot) | `appInfo() -> string` | JSON metadata (name, version, server URL, theme, Qt version) |
| JS → Python (slot) | `ping() -> string` | In-process liveness check |
| JS → Python (slot) | `getTheme() -> string` | Current theme |
| JS → Python (slot) | `setTheme(theme)` | Switch theme (`dark`/`light`) |
| JS → Python (slot) | `log(message)` | Log a frontend message |
| JS → Python (slot) | `fetchHealth()` / `fetchReady()` / `fetchPing()` / `fetchUuid()` | Call the backend off-thread |
| Python → JS (signal) | `notification(string)` | User-facing notification text |
| Python → JS (signal) | `serverResponse(string)` | JSON payload for a backend call |
| Python → JS (signal) | `themeChanged(string)` | Theme was changed |
| Python → JS (signal) | `busyChanged(bool)` | Backend request in flight |

```ts
const bridge = await initBridge();
bridge.notify("hello from the UI");
bridge.fetch("health");
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