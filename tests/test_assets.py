"""Fallback web asset sanity checks."""

from __future__ import annotations

from pathlib import Path

WEB_ROOT = Path(__file__).resolve().parent.parent / "app" / "resources" / "web"


def test_fallback_assets_exist() -> None:
    for name in ("index.html", "index.js", "styles.css", "qwebchannel.js"):
        assert (WEB_ROOT / name).is_file(), f"missing fallback asset: {name}"


def test_index_html_references_scripts_and_styles() -> None:
    html = (WEB_ROOT / "index.html").read_text(encoding="utf-8")
    assert "index.js" in html
    assert "qwebchannel.js" in html
    assert "styles.css" in html


def test_index_js_calls_bridge() -> None:
    script = (WEB_ROOT / "index.js").read_text(encoding="utf-8")
    assert "QWebChannel" in script
    assert "fetchHealth" in script or "fetch" in script
    assert "setTheme" in script


def test_qwebchannel_is_vendored() -> None:
    script = (WEB_ROOT / "qwebchannel.js").read_text(encoding="utf-8")
    assert "QWebChannel" in script
