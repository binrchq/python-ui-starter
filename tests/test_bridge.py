"""QWebChannel bridge tests (skipped when PySide6 is unavailable)."""

from __future__ import annotations

import json
from typing import Any

import pytest

pytest.importorskip("PySide6")

from app.config import Config  # noqa: E402
from app.window.bridge import AppBridge  # noqa: E402


class FakeApi:
    def health(self) -> dict[str, Any]:
        return {"status": "healthy"}

    def ready(self) -> dict[str, Any]:
        return {"status": "ready"}

    def ping(self) -> dict[str, Any]:
        return {"message": "pong"}

    def uuid(self) -> dict[str, Any]:
        return {"uuid": "00000000-0000-0000-0000-000000000000"}


@pytest.fixture
def bridge() -> AppBridge:
    config = Config()
    instance = AppBridge(config, FakeApi())  # type: ignore[arg-type]
    yield instance
    instance.shutdown()


def test_app_info(bridge: AppBridge) -> None:
    info = json.loads(bridge.appInfo())
    assert info["name"] == "python-ui-starter"
    assert info["serverUrl"] == "http://127.0.0.1:8000"


def test_in_process_ping(bridge: AppBridge) -> None:
    assert bridge.ping() == "pong"


def test_set_theme_emits_signal(bridge: AppBridge) -> None:
    received: list[str] = []
    bridge.themeChanged.connect(received.append)
    bridge.setTheme("light")
    assert received == ["light"]
    assert bridge.getTheme() == "light"


def test_set_theme_rejects_unknown(bridge: AppBridge) -> None:
    notices: list[str] = []
    bridge.notification.connect(notices.append)
    bridge.setTheme("neon")
    assert notices and "unknown theme" in notices[0]
