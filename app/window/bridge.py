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
from PySide6.QtCore import QObject, Signal, Slot

from app import __version__
from app.config import Config
from app.services.api_client import ApiClient


class AppBridge(QObject):
    """The single object registered on the web channel."""

    notification = Signal(str)
    themeChanged = Signal(str)
    serverResponse = Signal(str)
    busyChanged = Signal(bool)

    def __init__(self, config: Config, api_client: ApiClient, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self._config = config
        self._api = api_client
        self._logger = logging.getLogger("app.bridge")
        self._executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="ui-api")
        self._closed = False

    # ------------------------------------------------------------------ #
    # Synchronous slots (return values to JavaScript)
    # ------------------------------------------------------------------ #
    @Slot(result=str)
    def appInfo(self) -> str:
        """Return static application metadata as a JSON string."""
        return json.dumps(
            {
                "name": "python-ui-starter",
                "version": __version__,
                "serverUrl": self._config.server.url,
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

    # ------------------------------------------------------------------ #
    # Command slots
    # ------------------------------------------------------------------ #
    @Slot(str)
    def log(self, message: str) -> None:
        """Log a message sent from the frontend and echo it back."""
        self._logger.info("frontend: %s", message)
        self.notification.emit(f"[ui] {message}")

    @Slot(str)
    def setTheme(self, theme: str) -> None:
        if theme not in {"dark", "light"}:
            self.notification.emit(f"[ui] unknown theme: {theme}")
            return
        self._config.ui.theme = theme
        self._logger.info("theme changed to %s", theme)
        self.themeChanged.emit(theme)

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

    # ------------------------------------------------------------------ #
    # Internals
    # ------------------------------------------------------------------ #
    def _run_async(self, kind: str, fn: Callable[[], dict[str, Any]]) -> None:
        if self._closed:
            return
        self.busyChanged.emit(True)
        self._executor.submit(self._invoke, kind, fn)

    def _invoke(self, kind: str, fn: Callable[[], dict[str, Any]]) -> None:
        try:
            data = fn()
            payload = {"kind": kind, "ok": True, "data": data}
        except Exception as exc:  # noqa: BLE001 - surfaced to the UI
            self._logger.warning("backend call %s failed: %s", kind, exc)
            payload = {"kind": kind, "ok": False, "error": str(exc)}
        finally:
            self.busyChanged.emit(False)
        self.serverResponse.emit(json.dumps(payload))

    def shutdown(self) -> None:
        """Stop accepting work and release the worker pool."""
        self._closed = True
        self._executor.shutdown(wait=False)


__all__ = ["AppBridge"]
