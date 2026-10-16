"""Configuration tests."""

from __future__ import annotations

from app.config import load_config


def test_defaults() -> None:
    config = load_config("does-not-exist.yaml")
    assert config.server.url == "http://127.0.0.1:8000"
    assert config.window.width == 1200
    assert config.ui.theme in {"dark", "light"}


def test_load_from_yaml(tmp_path) -> None:
    path = tmp_path / "config.yaml"
    path.write_text(
        "server:\n  url: http://api.internal:9000\nwindow:\n  title: Custom\n  width: 640\n",
        encoding="utf-8",
    )
    config = load_config(path)
    assert config.server.url == "http://api.internal:9000"
    assert config.window.title == "Custom"
    assert config.window.width == 640


def test_env_override(tmp_path, monkeypatch) -> None:
    path = tmp_path / "config.yaml"
    path.write_text("server:\n  url: http://yaml:1\n", encoding="utf-8")
    monkeypatch.setenv("UI__SERVER__URL", "http://env:2")
    config = load_config(path)
    assert config.server.url == "http://env:2"
