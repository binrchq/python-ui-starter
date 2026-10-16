"""Synchronous API client for the python-server-starter backend."""

from __future__ import annotations

from typing import Any

import httpx


class ApiClientError(RuntimeError):
    """Raised when a backend request fails."""


class ApiClient:
    """Thin, reusable HTTP client (thread-safe for the bridge's worker pool)."""

    def __init__(self, base_url: str, timeout: float = 5.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._client = self._build_client()

    @property
    def base_url(self) -> str:
        return self._base_url

    def _build_client(self) -> httpx.Client:
        return httpx.Client(
            base_url=self._base_url,
            timeout=self._timeout,
            headers={"accept": "application/json"},
        )

    def reconfigure(self, base_url: str, timeout: float | None = None) -> None:
        """Point the client at a new backend without recreating the bridge."""
        self._base_url = base_url.rstrip("/")
        if timeout is not None:
            self._timeout = timeout
        self._client.close()
        self._client = self._build_client()

    def request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
        """Perform an arbitrary request against the configured backend."""
        try:
            response = self._client.request(method.upper(), path, json=payload)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ApiClientError(str(exc)) from exc
        if not response.content:
            return {}
        try:
            return response.json()
        except ValueError:
            return {"raw": response.text}

    # Convenience wrappers over well-known outer-port endpoints. ------------ #
    def health(self) -> Any:
        return self.request("GET", "/health")

    def ready(self) -> Any:
        return self.request("GET", "/ready")

    def ping(self) -> Any:
        return self.request("GET", "/api/public/ping")

    def uuid(self) -> Any:
        return self.request("GET", "/api/public/uuid")

    def close(self) -> None:
        self._client.close()


__all__ = ["ApiClient", "ApiClientError"]
