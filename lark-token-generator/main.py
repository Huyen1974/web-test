"""Cloud Function to generate and rotate Lark app access token."""

import logging
import os
import time

import functions_framework
import requests
from flask import jsonify
from google.cloud import secretmanager

PROJECT_ID = os.environ.get("GCP_PROJECT", "github-chatgpt-ggcloud")
APP_SECRET_ID = "lark-app-secret-sg"
APP_ID = "cli_a785d634437a502f"
TARGET_SECRET_ID = "lark-access-token-sg"
LARK_TOKEN_URL = (
    "https://open.larksuite.com/open-apis/auth/v3/app_access_token/internal/"
)
REQUEST_TIMEOUT = int(os.environ.get("REQUEST_TIMEOUT", "10"))
RETRY_COUNT = int(os.environ.get("RETRY_COUNT", "3"))
RETRY_DELAY = int(os.environ.get("RETRY_DELAY", "2"))

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))
handler = logging.StreamHandler()
handler.setFormatter(
    logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
)
logger.addHandler(handler)

secret_client = secretmanager.SecretManagerServiceClient()


def _read_secret(secret_id: str) -> str | None:
    name = secret_client.secret_version_path(PROJECT_ID, secret_id, "latest")
    try:
        response = secret_client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except Exception as exc:  # pylint: disable=broad-except
        logger.error("Failed to read secret %s: %s", secret_id, exc)
        return None


def _save_secret(secret_id: str, value: str) -> bool:
    parent = secret_client.secret_path(PROJECT_ID, secret_id)
    try:
        response = secret_client.add_secret_version(
            request={"parent": parent, "payload": {"data": value.encode("UTF-8")}}
        )
        logger.info("Stored new secret version: %s", response.name)
        return True
    except Exception as exc:  # pylint: disable=broad-except
        logger.error("Failed to store secret %s: %s", secret_id, exc)
        return False


def _cleanup_old_versions(secret_id: str) -> None:
    parent = secret_client.secret_path(PROJECT_ID, secret_id)
    try:
        versions = list(secret_client.list_secret_versions(request={"parent": parent}))
        versions.sort(key=lambda ver: ver.create_time, reverse=True)
        for version in versions[1:]:
            if version.state == secretmanager.SecretVersion.State.ENABLED:
                secret_client.disable_secret_version(request={"name": version.name})
                secret_client.destroy_secret_version(request={"name": version.name})
                logger.info("Destroyed old secret version: %s", version.name)
    except Exception as exc:  # pylint: disable=broad-except
        logger.error("Cleanup of old versions failed for %s: %s", secret_id, exc)


def _call_lark_api(payload: dict) -> requests.Response:
    headers = {"Content-Type": "application/json"}
    last_error: Exception | None = None
    for attempt in range(1, RETRY_COUNT + 1):
        try:
            logger.info("Calling Lark token API attempt %s", attempt)
            response = requests.post(
                LARK_TOKEN_URL,
                json=payload,
                headers=headers,
                timeout=REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            return response
        except requests.RequestException as exc:  # pylint: disable=broad-except
            last_error = exc
            logger.warning(
                "Call to Lark token API failed (attempt %s/%s): %s",
                attempt,
                RETRY_COUNT,
                exc,
            )
            if attempt < RETRY_COUNT:
                logger.info("Retrying in %s seconds", RETRY_DELAY)
                time.sleep(RETRY_DELAY)
    assert last_error is not None
    raise last_error


@functions_framework.http
def generate_lark_token(request):  # pylint: disable=unused-argument
    logger.info("Starting Lark token generation flow")

    app_secret = _read_secret(APP_SECRET_ID)
    if not app_secret:
        logger.error("App secret missing, aborting token generation")
        return jsonify({"status": "ERROR", "message": "App secret unavailable"}), 400

    payload = {"app_id": APP_ID, "app_secret": app_secret}

    try:
        response = _call_lark_api(payload)
        data = response.json()
    except Exception as exc:  # pylint: disable=broad-except
        logger.error("Failed to call Lark token API: %s", exc)
        return jsonify({"status": "ERROR", "message": f"Lark API failure: {exc}"}), 500

    token = data.get("app_access_token") if data else None
    if not token or data.get("code") != 0:
        error_msg = (
            data.get("msg", "Invalid response from Lark API")
            if data
            else "Empty response"
        )
        logger.error("Invalid token response: %s", error_msg)
        return jsonify({"status": "ERROR", "message": error_msg}), 500

    if not _save_secret(TARGET_SECRET_ID, token):
        logger.error("Storing new Lark token failed")
        return jsonify({"status": "ERROR", "message": "Failed to store token"}), 500

    _cleanup_old_versions(TARGET_SECRET_ID)

    logger.info("Successfully rotated Lark token")
    return jsonify({"status": "OK", "message": "Token rotated"}), 200
