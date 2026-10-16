"""Application entrypoint.

Boots the Qt6 host, registers the ``app://`` scheme, creates the QWebChannel
bridge, and shows the main window with the embedded TypeScript frontend.
"""

from __future__ import annotations

import argparse
import sys

from app import __version__
from app.config import load_config
from app.log import setup_logging


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python-ui-starter",
        description="Qt6 host with an embedded TypeScript frontend (QWebChannel).",
    )
    parser.add_argument("--config", "-c", default="config.yaml", help="Config file path")
    parser.add_argument("--dev", action="store_true", help="Load the Vite dev server instead of bundled assets")
    parser.add_argument(
        "--dev-url",
        default="http://localhost:5173",
        help="Vite dev server URL used with --dev",
    )
    parser.add_argument("--log-level", default="info", help="debug | info | warning | error")
    parser.add_argument("--version", action="version", version=f"python-ui-starter {__version__}")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    config = load_config(args.config)
    if args.dev:
        config.frontend.dev_url = args.dev_url

    logger = setup_logging(args.log_level).getChild("main")
    logger.info(
        "starting %s (server=%s, dev_url=%s)",
        config.window.title,
        config.server.url,
        config.frontend.dev_url or "-",
    )

    # Qt imports are lazy so `--help`/`--version` work without PySide6 present.
    from PySide6.QtWidgets import QApplication

    from app.services.api_client import ApiClient
    from app.view.webview import register_app_scheme
    from app.window.bridge import AppBridge
    from app.window.main_window import MainWindow

    register_app_scheme()

    qt_argv = list(sys.argv) if argv is None else ["python-ui-starter", *argv]
    app = QApplication.instance() or QApplication(qt_argv)
    app.setOrganizationName("BINRC")
    app.setOrganizationDomain("binr.ch")
    app.setApplicationName("python-ui-starter")
    app.setApplicationVersion(__version__)

    api_client = ApiClient(config.server.url, config.server.timeout)
    bridge = AppBridge(config, api_client)
    window = MainWindow(config, bridge)
    window.show()

    try:
        return app.exec()
    finally:
        bridge.shutdown()
        api_client.close()
        logger.info("application exited")


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())


__all__ = ["build_parser", "main"]
