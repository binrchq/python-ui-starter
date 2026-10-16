"""Entrypoint argument parsing tests (no Qt required)."""

from __future__ import annotations

from app.main import build_parser


def test_defaults() -> None:
    args = build_parser().parse_args([])
    assert args.config == "config.yaml"
    assert args.dev is False
    assert args.dev_url == "http://localhost:5173"


def test_dev_flag() -> None:
    args = build_parser().parse_args(["--dev", "--dev-url", "http://localhost:4000"])
    assert args.dev is True
    assert args.dev_url == "http://localhost:4000"


def test_config_override() -> None:
    args = build_parser().parse_args(["--config", "/etc/ui.yaml"])
    assert args.config == "/etc/ui.yaml"
