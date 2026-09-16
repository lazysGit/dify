"""Live Service API smoke tests against a running local API.

These tests call http://localhost:5001/v1 and are skipped unless an app API key
is provided. Do not commit real keys.

    DIFY_APP_API_KEY=app-xxx uv run --project api pytest \\
        api/tests/unit_tests/controllers/service_api/app/test_live_app_api_smoke.py -q
"""

from __future__ import annotations

import os

import httpx
import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("DIFY_APP_API_KEY"),
    reason="Set DIFY_APP_API_KEY to run live Service API smoke tests",
)

SERVICE_API_URL = os.getenv("DIFY_SERVICE_API_URL", "http://localhost:5001")
CHAT_TIMEOUT_SECONDS = 90.0


def _api_key() -> str:
    return os.environ["DIFY_APP_API_KEY"]


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {_api_key()}"}


@pytest.fixture(scope="module")
def client() -> httpx.Client:
    with httpx.Client(base_url=SERVICE_API_URL, timeout=30.0) as http_client:
        yield http_client


def test_info_accepts_api_key(client: httpx.Client) -> None:
    response = client.get("/v1/info", headers=_headers())

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["name"]
    assert body["mode"] in {"chat", "advanced-chat", "agent-chat", "completion", "workflow"}


def test_parameters_accepts_api_key(client: httpx.Client) -> None:
    response = client.get("/v1/parameters", headers=_headers())

    assert response.status_code == 200, response.text
    body = response.json()
    assert "user_input_form" in body


def test_chat_messages_blocking(client: httpx.Client) -> None:
    info = client.get("/v1/info", headers=_headers())
    assert info.status_code == 200, info.text
    mode = info.json()["mode"]
    if mode not in {"chat", "advanced-chat", "agent-chat"}:
        pytest.skip(f"app mode {mode} does not use /v1/chat-messages")

    response = client.post(
        "/v1/chat-messages",
        headers=_headers(),
        json={
            "inputs": {},
            "query": "你好，请只回复一个字：好",
            "response_mode": "blocking",
            "user": "api-smoke-test",
        },
        timeout=CHAT_TIMEOUT_SECONDS,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body.get("answer")
    assert body.get("conversation_id")
    assert body.get("message_id")
