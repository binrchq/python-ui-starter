"""Host system information tests (no Qt required)."""

from __future__ import annotations

from app.services.system_info import collect_system_info

EXPECTED_KEYS = {
    "platform",
    "release",
    "machine",
    "processor",
    "pythonVersion",
    "pythonExecutable",
    "cpuCount",
    "pid",
    "cwd",
    "pysideVersion",
    "qtVersion",
    "memoryMb",
}


def test_collect_system_info_keys() -> None:
    info = collect_system_info()
    assert EXPECTED_KEYS.issubset(info.keys())


def test_collect_system_info_types() -> None:
    info = collect_system_info()
    assert isinstance(info["cpuCount"], int)
    assert info["cpuCount"] >= 1
    assert isinstance(info["pid"], int)
    assert info["pid"] > 0
    assert isinstance(info["pythonVersion"], str)
    assert isinstance(info["cwd"], str)


def test_qt_fields_tolerate_missing_pyside() -> None:
    info = collect_system_info()
    # Either a version string or None (when PySide6 is unavailable).
    assert info["pysideVersion"] is None or isinstance(info["pysideVersion"], str)
