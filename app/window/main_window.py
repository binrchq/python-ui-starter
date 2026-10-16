"""Main application window hosting the embedded web view."""

from __future__ import annotations

import json

from PySide6.QtCore import QSettings, Slot
from PySide6.QtGui import QAction, QCloseEvent, QKeySequence
from PySide6.QtWidgets import QMainWindow, QMessageBox

from app import __version__
from app.config import Config
from app.view.webview import WebView
from app.window.bridge import AppBridge


class MainWindow(QMainWindow):
    def __init__(self, config: Config, bridge: AppBridge, parent: object | None = None) -> None:
        super().__init__(parent)
        self._config = config
        self._bridge = bridge
        self._settings = QSettings()
        self._always_on_top_action: QAction | None = None

        self.setWindowTitle(config.window.title)
        self.resize(config.window.width, config.window.height)
        self.setMinimumSize(config.window.min_width, config.window.min_height)

        self._view = WebView(config, bridge, self)
        self.setCentralWidget(self._view)

        self._status = self.statusBar()
        self._status.showMessage("Ready")

        bridge.attach_window(self)
        self._build_menu()
        self._restore_geometry()

        bridge.notification.connect(self._on_notification)
        bridge.busyChanged.connect(self._on_busy_changed)
        bridge.windowStateChanged.connect(self._on_window_state_changed)
        self._view.bridgeReady.connect(self._on_bridge_ready)
        self._view.loadFailed.connect(self._on_load_failed)

    # ------------------------------------------------------------------ #
    # Menu
    # ------------------------------------------------------------------ #
    def _build_menu(self) -> None:
        menu = self.menuBar()

        file_menu = menu.addMenu("&File")
        file_menu.addAction(self._action("Open file…", "Ctrl+O", self._open_file))
        file_menu.addAction(self._action("Save file…", "Ctrl+S", self._save_file))
        file_menu.addAction(self._action("Choose folder…", "Ctrl+Shift+O", self._select_directory))
        file_menu.addSeparator()
        file_menu.addAction(self._action("Quit", "Ctrl+Q", self.close))

        view_menu = menu.addMenu("&View")
        view_menu.addAction(self._action("Toggle theme", "Ctrl+T", self._toggle_theme))
        view_menu.addAction(self._action("Full screen", "F11", self._toggle_full_screen))
        self._always_on_top_action = self._action(
            "Always on top", "Ctrl+Shift+T", self._toggle_always_on_top
        )
        self._always_on_top_action.setCheckable(True)
        view_menu.addAction(self._always_on_top_action)
        view_menu.addSeparator()
        view_menu.addAction(self._action("Reload frontend", "Ctrl+R", self._view.reload))

        help_menu = menu.addMenu("&Help")
        help_menu.addAction(self._action("About", None, self._show_about))

    def _action(self, text: str, shortcut: str | None, handler) -> QAction:
        action = QAction(text, self)
        if shortcut:
            action.setShortcut(QKeySequence(shortcut))
        action.triggered.connect(handler)
        return action

    # ------------------------------------------------------------------ #
    # Menu handlers
    # ------------------------------------------------------------------ #
    def _open_file(self) -> None:
        self._bridge.openFile()

    def _save_file(self) -> None:
        self._bridge.saveFile()

    def _select_directory(self) -> None:
        self._bridge.selectDirectory()

    def _toggle_theme(self) -> None:
        next_theme = "light" if self._config.ui.theme == "dark" else "dark"
        self._bridge.setTheme(next_theme)

    def _toggle_full_screen(self) -> None:
        self._bridge.toggleFullScreen()

    def _toggle_always_on_top(self, checked: bool) -> None:
        self._bridge.setAlwaysOnTop(checked)

    def _show_about(self) -> None:
        QMessageBox.about(
            self,
            "About python-ui-starter",
            f"<b>python-ui-starter</b> {__version__}<br>"
            "Qt6 host with an embedded TypeScript frontend.<br><br>"
            f"Backend: {self._config.server.url}",
        )

    # ------------------------------------------------------------------ #
    # Window persistence
    # ------------------------------------------------------------------ #
    def _restore_geometry(self) -> None:
        geometry = self._settings.value("window/geometry")
        if geometry is not None:
            self.restoreGeometry(geometry)
        state = self._settings.value("window/state")
        if state is not None:
            self.restoreState(state)

    def closeEvent(self, event: QCloseEvent) -> None:  # noqa: N802 (Qt override)
        self._settings.setValue("window/geometry", self.saveGeometry())
        self._settings.setValue("window/state", self.saveState())
        super().closeEvent(event)

    # ------------------------------------------------------------------ #
    # Bridge / view callbacks
    # ------------------------------------------------------------------ #
    @Slot(str)
    def _on_notification(self, message: str) -> None:
        self._status.showMessage(message, 5000)

    @Slot(bool)
    def _on_busy_changed(self, busy: bool) -> None:
        self._status.showMessage("Calling backend…" if busy else "Ready")

    @Slot(str)
    def _on_window_state_changed(self, payload: str) -> None:
        state = json.loads(payload)
        if self._always_on_top_action is not None:
            self._always_on_top_action.setChecked(bool(state.get("alwaysOnTop")))

    @Slot()
    def _on_bridge_ready(self) -> None:
        self._status.showMessage("Frontend connected")

    @Slot(str)
    def _on_load_failed(self, message: str) -> None:
        self._status.showMessage(f"Frontend load failed: {message}")


__all__ = ["MainWindow"]
