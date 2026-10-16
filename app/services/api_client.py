"""Synchronous API client for the python-server-starter backend."""

from __future__ import annotations

from typing import Any

import httpx


class ApiClientError(RuntimeError):
    """Raised when a backend request fails."""


class ApiClient:
    """Thin, reusable HTTP client (thread-safe for the bridge's worker pool)."""

    def __init__(self, base_url: str, timeout: float = 5.0) -> None:
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers={"accept": "application/json"},
        )

    def _get(self, path: str) -> dict[str, Any]:
        try:
            response = self._client.get(path)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            raise ApiClientError(str(exc)) from exc

    def health(self) -> dict[str, Any]:
        return self._get("/health")

    def ready(self) -> dict[str, Any]:
        return self._get("/ready")

    def ping(self) -> dict[str, Any]:
        return self._get("/api/public/ping")

    def uuid(self) -> dict[str, Any]:
        return self._get("/api/public/uuid")

    def close(self) -> None:
        self._client.close()


__all__ = ["ApiClient", "ApiClientError"]
