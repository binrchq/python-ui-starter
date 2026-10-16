"""QWebChannel bridge exposing Python capabilities to the TypeScript frontend.

Slots are callable from JavaScript via the ``bridge`` object. Signals push
events back to the frontend. Blocking backend calls run on a worker thread so
the Qt event loop never stalls.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from PySide6 import __version__ as pyside_version
from PySide6.QtCore import (
    QCoreApplication,
    QObject,
    QSettings,
    Qt,
    QTimer,
    QUrl,
    Signal,
    Slot,
)
from PySide6.QtGui import QDesktopServices, QGuiApplication
from PySide6.QtWidgets import QFileDialog, QMainWindow

from app import __version__
from app.config import Config
from app.services.api_client import ApiClient
from app.services.system_info import collect_system_info

_OPEN_URL_SCHEMES = {"http", "https", "mailto"}
_DEBUG_PAYLOAD_VALUES = {"", "null", "undefined"}


def _parse_payload(payload_json: str) -> dict[str, Any] | None:
    if payload_json.strip().lower() in _DEBUG_PAYLOAD_VALUES:
        return None
    try:
        data = json.loads(payload_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid JSON payload: {exc}") from exc
    if data is not None and not isinstance(data, dict):
        raise ValueError("payload must be a JSON object")
    return data


class AppBridge(QObject):
    """The single object registered on the web channel."""

    notification = Signal(str)
    themeChanged = Signal(str)
    serverResponse = Signal(str)
    busyChanged = Signal(bool)
    connectionChanged = Signal(bool)
    windowStateChanged = Signal(str)

    def __init__(self, config: Config, api_client: ApiClient, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self._config = config
        self._api = api_client
        self._logger = logging.getLogger("app.bridge")
        self._executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="ui-api")
        self._closed = False
        self._window: QMainWindow | None = None
        self._always_on_top = False
        self._poll_timer: QTimer | None = None
        # QSettings is only meaningful once a QCoreApplication exists.
        self._settings = QSettings() if QCoreApplication.instance() is not None else None
        self._restore_theme()

    def attach_window(self, window: QMainWindow) -> None:
        """Give the bridge a window handle for native window controls."""
        self._window = window

    # ------------------------------------------------------------------ #
    # Synchronous slots (return values to JavaScript)
    # ------------------------------------------------------------------ #
    @Slot(result=str)
    def appInfo(self) -> str:
        return json.dumps(
            {
                "name": "python-ui-starter",
                "version": __version__,
                "serverUrl": self._api.base_url,
                "theme": self._config.ui.theme,
                "accent": self._config.ui.accent,
                "qtVersion": pyside_version,
            }
        )

    @Slot(result=str)
    def ping(self) -> str:
        """In-process liveness check for the bridge itself."""
        return "pong"

    @Slot(result=str)
    def getTheme(self) -> str:
        return self._config.ui.theme

    @Slot(result=str)
    def systemInfo(self) -> str:
        return json.dumps(collect_system_info())

    @Slot(result=str)
    def readClipboard(self) -> str:
        clipboard = QGuiApplication.clipboard()
        return clipboard.text() if clipboard is not None else ""

    @Slot(result=bool)
    def isFullScreen(self) -> bool:
        return bool(self._window and self._window.isFullScreen())

    @Slot(str, result=str)
    def getSetting(self, key: str) -> str:
        if self._settings is None:
            return ""
        value = self._settings.value(key, "")
        return "" if value is None else str(value)

    # ------------------------------------------------------------------ #
    # Commands
    # ------------------------------------------------------------------ #
    @Slot(str)
    def log(self, message: str) -> None:
        self._logger.info("frontend: %s", message)
        self.notification.emit(f"[ui] {message}")

    @Slot(str)
    def setTheme(self, theme: str) -> None:
        if theme not in {"dark", "light"}:
            self.notification.emit(f"[ui] unknown theme: {theme}")
            return
        self._config.ui.theme = theme
        self._persist("ui/theme", theme)
        self._logger.info("theme changed to %s", theme)
        self.themeChanged.emit(theme)

    @Slot(str, str)
    def setSetting(self, key: str, value: str) -> None:
        self._persist(key, value)

    @Slot(str)
    def writeClipboard(self, text: str) -> None:
        clipboard = QGuiApplication.clipboard()
        if clipboard is not None:
            clipboard.setText(text)
        self.notification.emit("[ui] copied to clipboard")

    @Slot(str, str)
    def showNotification(self, title: str, message: str) -> None:
        self.notification.emit(f"{title}: {message}")

    @Slot(str)
    def openUrl(self, url: str) -> None:
        parsed = QUrl(url)
        if parsed.scheme() not in _OPEN_URL_SCHEMES:
            self.notification.emit(f"[ui] refused to open non-web URL: {url}")
            return
        QDesktopServices.openUrl(parsed)

    @Slot(str)
    def setServerUrl(self, url: str) -> None:
        self._api.reconfigure(url)
        self.notification.emit(f"[ui] backend set to {self._api.base_url}")

    @Slot(str)
    def setAlwaysOnTop(self, enabled: bool) -> None:
        self._always_on_top = bool(enabled)
        if self._window is not None:
            self._window.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint, self._always_on_top)
            self._window.show()
        self._emit_window_state()

    @Slot(bool)
    def setFullScreen(self, enabled: bool) -> None:
        if self._window is not None:
            if enabled:
                self._window.showFullScreen()
            else:
                self._window.showNormal()
        self._emit_window_state()

    @Slot(result=bool)
    def toggleFullScreen(self) -> bool:
        now_full = not self.isFullScreen()
        self.setFullScreen(now_full)
        return now_full

    # ------------------------------------------------------------------ #
    # Native dialogs (modal; return a JSON result string)
    # ------------------------------------------------------------------ #
    @Slot(str, result=str)
    def openFile(self, filters: str = "") -> str:
        path, _ = QFileDialog.getOpenFileName(
            self._window, "Open file", "", filters or "All Files (*)"
        )
        return json.dumps({"ok": bool(path), "path": path})

    @Slot(str, result=str)
    def saveFile(self, default_name: str = "") -> str:
        path, _ = QFileDialog.getSaveFileName(
            self._window, "Save file", default_name, "All Files (*)"
        )
        return json.dumps({"ok": bool(path), "path": path})

    @Slot(result=str)
    def selectDirectory(self) -> str:
        path = QFileDialog.getExistingDirectory(self._window, "Choose directory")
        return json.dumps({"ok": bool(path), "path": path})

    # ------------------------------------------------------------------ #
    # Backend calls (off the UI thread)
    # ------------------------------------------------------------------ #
    @Slot()
    def fetchHealth(self) -> None:
        self._run_async("health", self._api.health)

    @Slot()
    def fetchReady(self) -> None:
        self._run_async("ready", self._api.ready)

    @Slot()
    def fetchPing(self) -> None:
        self._run_async("ping", self._api.ping)

    @Slot()
    def fetchUuid(self) -> None:
        self._run_async("uuid", self._api.uuid)

    @Slot(str, str, str)
    def request(self, method: str, path: str, payload_json: str) -> None:
        def call() -> Any:
            return self._api.request(method, path, _parse_payload(payload_json))

        self._run_async("request", call)

    @Slot(int)
    def startHealthPolling(self, interval_ms: int) -> None:
        timer = self._ensure_poll_timer()
        timer.setInterval(max(int(interval_ms), 500))
        timer.start()
        self._poll_health()

    @Slot()
    def stopHealthPolling(self) -> None:
        if self._poll_timer is not None:
            self._poll_timer.stop()

    # ------------------------------------------------------------------ #
    # Internals
    # ------------------------------------------------------------------ #
    def _run_async(self, kind: str, fn: Callable[[], Any]) -> None:
        if self._closed:
            return
        self.busyChanged.emit(True)
        self._executor.submit(self._invoke, kind, fn)

    def _invoke(self, kind: str, fn: Callable[[], Any]) -> None:
        try:
            data = fn()
            payload = {"kind": kind, "ok": True, "data": data}
        except Exception as exc:  # noqa: BLE001 - surfaced to the UI
            self._logger.warning("backend call %s failed: %s", kind, exc)
            payload = {"kind": kind, "ok": False, "error": str(exc)}
        finally:
            self.busyChanged.emit(False)
        self.serverResponse.emit(json.dumps(payload))

    def _ensure_poll_timer(self) -> QTimer:
        if self._poll_timer is None:
            self._poll_timer = QTimer(self)
            self._poll_timer.timeout.connect(self._poll_health)
        return self._poll_timer

    def _poll_health(self) -> None:
        if self._closed:
            return
        self._executor.submit(self._check_connection)

    def _check_connection(self) -> None:
        try:
            self._api.health()
            ok = True
        except Exception as exc:  # noqa: BLE001 - connection probe
            self._logger.debug("health poll failed: %s", exc)
            ok = False
        self.connectionChanged.emit(ok)

    def _emit_window_state(self) -> None:
        self.windowStateChanged.emit(
            json.dumps(
                {
                    "fullScreen": bool(self._window and self._window.isFullScreen()),
                    "alwaysOnTop": self._always_on_top,
                }
            )
        )

    def _restore_theme(self) -> None:
        if self._settings is None:
            return
        stored = self._settings.value("ui/theme", "")
        if stored in {"dark", "light"}:
            self._config.ui.theme = str(stored)

    def _persist(self, key: str, value: str) -> None:
        if self._settings is not None:
            self._settings.setValue(key, value)

    def shutdown(self) -> None:
        """Stop background work and release the worker pool."""
        self._closed = True
        if self._poll_timer is not None:
            self._poll_timer.stop()
        self._executor.shutdown(wait=False)


__all__ = ["AppBridge"]
