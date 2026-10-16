"""Configuration models for the Qt6 + TypeScript desktop scaffold."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)

DEFAULT_CONFIG_PATH = os.getenv("UI_CONFIG_FILE", "config.yaml")

_yaml_file: str | None = DEFAULT_CONFIG_PATH


class ServerConfig(BaseModel):
    """Backend (python-server-starter) connection settings."""

    url: str = "http://127.0.0.1:8000"
    timeout: float = 5.0


class FrontendConfig(BaseModel):
    """Frontend loading strategy."""

    dev_url: str | None = None


class WindowConfig(BaseModel):
    """Main window geometry and title."""

    title: str = "python-ui-starter"
    width: int = 1200
    height: int = 800
    min_width: int = 900
    min_height: int = 600


class UIConfig(BaseModel):
    """Appearance preferences shared with the TypeScript frontend."""

    theme: str = "dark"  # dark | light
    accent: str = "#7c5cff"


class _YamlSource(PydanticBaseSettingsSource):
    def __init__(self, settings_cls: type[BaseSettings], yaml_file: str | None) -> None:
        super().__init__(settings_cls)
        self._yaml_file = yaml_file

    def get_field_value(self, field: Any, field_name: str) -> tuple[Any, str, bool]:  # noqa: ARG002
        return self._load().get(field_name), field_name, False

    def __call__(self) -> dict[str, Any]:
        return self._load()

    def _load(self) -> dict[str, Any]:
        if not self._yaml_file:
            return {}
        path = Path(self._yaml_file)
        if not path.is_file():
            return {}
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        if not isinstance(raw, dict):
            return {}
        valid = set(self.settings_cls.model_fields.keys())
        return {key: value for key, value in raw.items() if key in valid}


class Config(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="UI__",
        env_nested_delimiter="__",
        case_sensitive=False,
        extra="ignore",
    )

    server: ServerConfig = Field(default_factory=ServerConfig)
    frontend: FrontendConfig = Field(default_factory=FrontendConfig)
    window: WindowConfig = Field(default_factory=WindowConfig)
    ui: UIConfig = Field(default_factory=UIConfig)

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            env_settings,
            _YamlSource(settings_cls, _yaml_file),
            dotenv_settings,
            file_secret_settings,
        )


def load_config(path: str | Path | None = None) -> Config:
    """Load configuration, optionally overriding the YAML file location."""
    global _yaml_file
    if path is not None:
        _yaml_file = str(path)
    return Config()


__all__ = [
    "Config",
    "FrontendConfig",
    "ServerConfig",
    "UIConfig",
    "WindowConfig",
    "load_config",
]
