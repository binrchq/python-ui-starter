"""API client tests using httpx's mock transport."""

from __future__ import annotations

import httpx
import pytest

from app.services.api_client import ApiClient, ApiClientError


@pytest.fixture
def client() -> ApiClient:
    api = ApiClient("http://test.local", timeout=1.0)

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/health":
            return httpx.Response(200, json={"status": "healthy"})
        if request.url.path == "/api/public/ping":
            return httpx.Response(200, json={"message": "pong"})
        return httpx.Response(404, json={"error": "not found"})

    api._client = httpx.Client(  # noqa: SLF001 - test seam
        base_url="http://test.local", transport=httpx.MockTransport(handler)
    )
    return api


def test_health(client: ApiClient) -> None:
    assert client.health() == {"status": "healthy"}


def test_ping(client: ApiClient) -> None:
    assert client.ping()["message"] == "pong"


def test_error_is_wrapped(client: ApiClient) -> None:
    with pytest.raises(ApiClientError):
        client.ready()
