"""Main application window hosting the embedded web view."""

from __future__ import annotations

from PySide6.QtCore import Slot
from PySide6.QtWidgets import QMainWindow

from app.config import Config
from app.view.webview import WebView
from app.window.bridge import AppBridge


class MainWindow(QMainWindow):
    def __init__(self, config: Config, bridge: AppBridge, parent: object | None = None) -> None:
        super().__init__(parent)
        self._config = config
        self._bridge = bridge

        self.setWindowTitle(config.window.title)
        self.resize(config.window.width, config.window.height)
        self.setMinimumSize(config.window.min_width, config.window.min_height)

        self._view = WebView(config, bridge, self)
        self.setCentralWidget(self._view)

        self._status = self.statusBar()
        self._status.showMessage("Ready")

        bridge.notification.connect(self._on_notification)
        bridge.busyChanged.connect(self._on_busy_changed)
        self._view.bridgeReady.connect(self._on_bridge_ready)
        self._view.loadFailed.connect(self._on_load_failed)

    @Slot(str)
    def _on_notification(self, message: str) -> None:
        self._status.showMessage(message, 5000)

    @Slot(bool)
    def _on_busy_changed(self, busy: bool) -> None:
        self._status.showMessage("Calling backend…" if busy else "Ready")

    @Slot()
    def _on_bridge_ready(self) -> None:
        self._status.showMessage("Frontend connected")

    @Slot(str)
    def _on_load_failed(self, message: str) -> None:
        self._status.showMessage(f"Frontend load failed: {message}")


__all__ = ["MainWindow"]
