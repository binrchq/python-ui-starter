# 🎓 python-ui-starter Hands-On Tutorial

A guided walkthrough for extending the Qt6 host, the QWebChannel bridge, and the
embedded TypeScript frontend.

---

## 📑 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Run in 2 minutes](#2-run-in-2-minutes)
3. [The architecture in one diagram](#3-the-architecture-in-one-diagram)
4. [Tutorial: Add a new bridge method](#4-tutorial-add-a-new-bridge-method)
5. [Tutorial: Call it from the TypeScript frontend](#5-tutorial-call-it-from-the-typescript-frontend)
6. [Tutorial: Add a native dialog](#6-tutorial-add-a-native-dialog)
7. [Theming](#7-theming)
8. [Packaging](#8-packaging)

---

## 1. Prerequisites

- **Python 3.10–3.13** (PySide6 does not yet ship wheels for 3.14)
- **Node 18+** for the full TypeScript build (optional — a fallback UI is bundled)

```bash
make venv install
```

---

## 2. Run in 2 minutes

```bash
# terminal 1 — backend (optional, for the backend buttons)
python -m app            # in ../python-server-starter

# terminal 2 — desktop app (bundled fallback UI, no Node required)
python -m app
```

To use the real TypeScript UI:

```bash
make frontend-install
make frontend-build
python -m app
```

For hot reload:

```bash
make dev       # Vite dev server
make run-dev   # Qt app loads http://localhost:5173
```

---

## 3. The architecture in one diagram

```text
Python (Qt host)                Qt WebEngine
───────────────                ─────────────
AppBridge  ◄──── QWebChannel ────►  window.bridge
ApiClient  ──── httpx ────────►  python-server-starter
WebView    ──── app://bundle/ ──►  index.html + bundle
```

- `app/view/webview.py` registers a `QWebEngineUrlSchemeHandler` for `app://`
  and loads `app://bundle/index.html`.
- `app/window/bridge.py` registers the `AppBridge` object under the name
  `bridge`; JavaScript reaches it via `channel.objects.bridge`.
- Blocking backend calls are dispatched to a `ThreadPoolExecutor`, and results
  are pushed to JavaScript with `serverResponse`.

---

## 4. Tutorial: Add a new bridge method

Add a slot to `app/window/bridge.py`:

```python
@Slot(result=str)
def currentUser(self) -> str:
    """Return the signed-in user (example)."""
    return json.dumps({"name": "logan", "roles": ["admin"]})

@Slot(str)
def openProject(self, project_id: str) -> None:
    self._logger.info("opening project %s", project_id)
    self.notification.emit(f"project {project_id} opened")
```

Or reuse the async helper for slow work:

```python
@Slot()
def fetchSyncStatus(self) -> None:
    self._run_async("sync", lambda: self._api._get("/api/sync/status/SYNC-001"))
```

---

## 5. Tutorial: Call it from the TypeScript frontend

Extend the typed bridge surface in `frontend/src/types.ts`:

```ts
export interface BridgeApi {
  // ...
  currentUser(): string;
  openProject(projectId: string): void;
}
```

Add a convenience method in `frontend/src/bridge.ts`:

```ts
currentUser(): { name: string; roles: string[] } {
  return JSON.parse(this.api.currentUser());
}

openProject(projectId: string): void {
  this.api.openProject(projectId);
}
```

Use it in `frontend/src/app.ts`:

```ts
button.addEventListener("click", () => {
  this.bridge?.openProject("PRJ-42");
});
```

Rebuild:

```bash
make frontend-build
```

---

## 6. Tutorial: Add a native dialog

Native UI stays in Python. Emit a signal so the frontend can react:

```python
from PySide6.QtWidgets import QFileDialog

@Slot()
def chooseFolder(self) -> None:
    folder = QFileDialog.getExistingDirectory(self.parent(), "Choose folder")
    if folder:
        self.notification.emit(f"selected: {folder}")
```

---

## 7. Theming

The theme lives in `config.ui.theme` and is mirrored to the DOM as
`document.documentElement.dataset.theme`. CSS variables in
`frontend/src/style.css` (and the fallback `styles.css`) define both themes.

```ts
bridge.setTheme("light");           // Python validates + emits themeChanged
bridge.onThemeChanged((t) => apply(t));
```

---

## 8. Packaging

```bash
make frontend-build
make package
```

`make package` runs PyInstaller with the web assets bundled. Distribute the
resulting `dist/python-ui-starter` directory (or build an installer with your
tool of choice).