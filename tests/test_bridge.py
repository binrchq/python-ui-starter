"""QWebChannel bridge tests (skipped when PySide6 is unavailable)."""

from __future__ import annotations

import json
from typing import Any

import pytest

pytest.importorskip("PySide6")

from app.config import Config  # noqa: E402
from app.window.bridge import AppBridge  # noqa: E402


class FakeApi:
    base_url = "http://127.0.0.1:8000"

    def health(self) -> dict[str, Any]:
        return {"status": "healthy"}

    def ready(self) -> dict[str, Any]:
        return {"status": "ready"}

    def ping(self) -> dict[str, Any]:
        return {"message": "pong"}

    def uuid(self) -> dict[str, Any]:
        return {"uuid": "00000000-0000-0000-0000-000000000000"}

    def request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
        return {"method": method, "path": path, "payload": payload}

    def reconfigure(self, base_url: str, timeout: float | None = None) -> None:
        self.base_url = base_url


@pytest.fixture
def bridge() -> AppBridge:
    instance = AppBridge(Config(), FakeApi())  # type: ignore[arg-type]
    yield instance
    instance.shutdown()


def test_app_info(bridge: AppBridge) -> None:
    info = json.loads(bridge.appInfo())
    assert info["name"] == "python-ui-starter"
    assert info["serverUrl"] == "http://127.0.0.1:8000"


def test_in_process_ping(bridge: AppBridge) -> None:
    assert bridge.ping() == "pong"


def test_system_info_json(bridge: AppBridge) -> None:
    info = json.loads(bridge.systemInfo())
    assert "pythonVersion" in info
    assert info["cpuCount"] >= 1


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


def test_open_url_rejects_non_web_scheme(bridge: AppBridge) -> None:
    notices: list[str] = []
    bridge.notification.connect(notices.append)
    bridge.openUrl("file:///etc/passwd")
    assert notices and "refused" in notices[0]


def test_window_state_emitted_without_window(bridge: AppBridge) -> None:
    states: list[str] = []
    bridge.windowStateChanged.connect(states.append)
    bridge.setAlwaysOnTop(True)
    assert states and json.loads(states[-1])["alwaysOnTop"] is True


def test_settings_are_noop_without_application(bridge: AppBridge) -> None:
    assert bridge.getSetting("missing") == ""
