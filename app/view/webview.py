"""Embedded web view serving the bundled frontend over a custom app:// scheme.

Loading from a custom scheme (rather than ``file://``) gives the frontend a
secure origin with CORS + ES module support, and lets QWebChannel inject its
transport reliably.
"""

from __future__ import annotations

import mimetypes
from pathlib import Path

from PySide6.QtCore import QBuffer, QByteArray, QIODevice, QUrl, Signal
from PySide6.QtWebChannel import QWebChannel
from PySide6.QtWebEngineCore import (
    QWebEngineUrlRequestJob,
    QWebEngineUrlScheme,
    QWebEngineUrlSchemeHandler,
)
from PySide6.QtWebEngineWidgets import QWebEngineView

from app.config import Config
from app.window.bridge import AppBridge

APP_SCHEME = "app"
APP_HOST = "bundle"
WEB_ROOT = Path(__file__).resolve().parent.parent / "resources" / "web"

_scheme_registered = False


def register_app_scheme() -> None:
    """Register the ``app://`` scheme. Must run before ``QApplication`` exists."""
    global _scheme_registered
    if _scheme_registered:
        return

    scheme = QWebEngineUrlScheme(QByteArray(APP_SCHEME.encode()))
    scheme.setFlags(
        QWebEngineUrlScheme.Flag.SecureScheme
        | QWebEngineUrlScheme.Flag.LocalAccessAllowed
        | QWebEngineUrlScheme.Flag.CorsEnabled
    )
    scheme.setSyntax(QWebEngineUrlScheme.Syntax.Host)
    QWebEngineUrlScheme.registerScheme(scheme)
    _scheme_registered = True


class BundleSchemeHandler(QWebEngineUrlSchemeHandler):
    """Serves files from the bundled web root."""

    def __init__(self, root: Path, parent: object | None = None) -> None:
        super().__init__(parent)
        self._root = root.resolve()

    def requestStarted(self, request: QWebEngineUrlRequestJob) -> None:  # noqa: N802 (Qt override)
        relative = request.requestUrl().path().lstrip("/") or "index.html"
        candidate = (self._root / relative).resolve()

        if not str(candidate).startswith(str(self._root)) or not candidate.is_file():
            request.fail(QWebEngineUrlRequestJob.Error.UrlNotFound)
            return

        mime = mimetypes.guess_type(str(candidate))[0] or "application/octet-stream"
        buffer = QBuffer(request)
        buffer.setData(candidate.read_bytes())
        if not buffer.open(QIODevice.OpenModeFlag.ReadOnly):
            request.fail(QWebEngineUrlRequestJob.Error.RequestFailed)
            return
        request.reply(QByteArray(mime.encode()), buffer)


class WebView(QWebEngineView):
    """QWebEngineView wired to the :class:`AppBridge` via QWebChannel."""

    bridgeReady = Signal()
    loadFailed = Signal(str)

    def __init__(self, config: Config, bridge: AppBridge, parent: object | None = None) -> None:
        super().__init__(parent)
        self._config = config
        self._channel = QWebChannel(self.page())
        self._channel.registerObject("bridge", bridge)
        self.page().setWebChannel(self._channel)

        self._handler = BundleSchemeHandler(WEB_ROOT, self)
        self.page().profile().installUrlSchemeHandler(QByteArray(APP_SCHEME.encode()), self._handler)

        self.loadFinished.connect(self._on_load_finished)
        self._load()

    def _load(self) -> None:
        dev_url = self._config.frontend.dev_url
        if dev_url:
            self.load(QUrl(dev_url))
        else:
            self.load(QUrl(f"{APP_SCHEME}://{APP_HOST}/index.html"))

    def _on_load_finished(self, ok: bool) -> None:  # noqa: N802 (Qt override)
        if ok:
            self.bridgeReady.emit()
        else:
            self.loadFailed.emit("failed to load frontend assets")


__all__ = ["BundleSchemeHandler", "WebView", "register_app_scheme"]
