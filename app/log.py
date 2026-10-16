"""Lightweight logging setup for the desktop application."""

from __future__ import annotations

import logging
import sys

_configured = False


def setup_logging(level: str = "info") -> logging.Logger:
    """Configure root logging once and return the application logger."""
    global _configured
    if not _configured:
        numeric = getattr(logging, level.upper(), logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)-7s %(name)s: %(message)s")
        )
        root = logging.getLogger()
        root.handlers = [handler]
        root.setLevel(numeric)
        _configured = True
    return logging.getLogger("app")


__all__ = ["setup_logging"]
