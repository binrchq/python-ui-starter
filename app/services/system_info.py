"""Host system information for the frontend.

Kept free of Qt imports so it is unit-testable without PySide6 installed.
"""

from __future__ import annotations

import os
import platform
import sys
from typing import Any


def _pyside_version() -> str | None:
    try:
        from PySide6 import __version__
    except ImportError:
        return None
    return __version__


def _qt_version() -> str | None:
    try:
        from PySide6.QtCore import qVersion
    except ImportError:
        return None
    return qVersion()


def _memory_mb() -> float | None:
    try:
        import psutil  # type: ignore[import-not-found]
    except ImportError:
        return None
    return round(psutil.Process().memory_info().rss / (1024 * 1024), 1)


def collect_system_info() -> dict[str, Any]:
    """Return a JSON-serialisable snapshot of the host environment."""
    return {
        "platform": platform.system(),
        "release": platform.release(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "pythonVersion": platform.python_version(),
        "pythonExecutable": sys.executable,
        "cpuCount": os.cpu_count() or 1,
        "pid": os.getpid(),
        "cwd": os.getcwd(),
        "pysideVersion": _pyside_version(),
        "qtVersion": _qt_version(),
        "memoryMb": _memory_mb(),
    }


__all__ = ["collect_system_info"]
