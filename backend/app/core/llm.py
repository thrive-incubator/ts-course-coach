"""Single entry point for every Gemini call.

Why one helper:
  * async client — a 20 s marketing-brief call no longer blocks other requests;
  * a request timeout — a hung call fails fast instead of spinning to Cloud Run's cap;
  * response_schema — Gemini is forced to emit the Pydantic shape, so no more
    "returned non-JSON" / stray-key 500s;
  * one JSONL log line per call (endpoint, model, latency, tokens, prompt, response)
    under data/llm_log/ so "it gave me something weird" can be diagnosed.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, TypeVar

from fastapi import HTTPException
from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings

logger = logging.getLogger(__name__)

LOG_DIR = Path("./data/llm_log")
REQUEST_TIMEOUT_MS = 60_000
_LOG_TEXT_CAP = 20_000  # chars of prompt / response kept per log line

T = TypeVar("T", bound=BaseModel)


def _client() -> genai.Client:
    # Not cached on purpose: the async client binds to the running event loop,
    # and a cached one breaks under TestClient / loop restarts. Construction is cheap.
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured")
    return genai.Client(
        api_key=settings.gemini_api_key,
        http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS),
    )


def _log(record: dict[str, Any]) -> None:
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with (LOG_DIR / f"{day}.jsonl").open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception:  # noqa: BLE001 — logging must never break a request
        logger.exception("llm log write failed")


def _contents_for_log(contents: Any) -> str:
    """Flatten contents (str or list of str/Part) to text for the log; binary parts become a marker."""
    if isinstance(contents, str):
        return contents[:_LOG_TEXT_CAP]
    out: list[str] = []
    for item in contents if isinstance(contents, list) else [contents]:
        if isinstance(item, str):
            out.append(item)
        elif isinstance(item, types.Part):
            if item.text:
                out.append(item.text)
            elif item.inline_data is not None:
                mime = item.inline_data.mime_type or "?"
                size = len(item.inline_data.data or b"")
                out.append(f"[inline {mime}, {size} bytes]")
        else:
            out.append(str(item))
    return "\n".join(out)[:_LOG_TEXT_CAP]


async def generate_json(
    *,
    endpoint: str,
    system: str,
    contents: str | list[Any],
    schema: type[T],
    temperature: float,
    thinking_level: str | None = None,
) -> T:
    """Call Gemini and return a validated `schema` instance.

    Raises HTTPException 502/504 with a user-readable message on failure.
    """
    settings = get_settings()
    client = _client()
    model = settings.gemini_model_flash

    config_kwargs: dict[str, Any] = dict(
        system_instruction=system,
        response_mime_type="application/json",
        response_schema=schema,
        temperature=temperature,
    )
    if thinking_level:
        config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_level=thinking_level)

    record: dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "endpoint": endpoint,
        "model": model,
        "temperature": temperature,
        "thinking_level": thinking_level or "default",
        "prompt": _contents_for_log(contents),
    }
    t0 = time.perf_counter()
    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(**config_kwargs),
        )
    except Exception as exc:  # noqa: BLE001
        record.update(latency_ms=int((time.perf_counter() - t0) * 1000), ok=False, error=str(exc)[:500])
        _log(record)
        logger.exception("gemini call failed (%s)", endpoint)
        is_timeout = "timeout" in str(exc).lower() or "timed out" in str(exc).lower()
        raise HTTPException(
            status_code=504 if is_timeout else 502,
            detail=(
                "The coach took too long to answer. Please try again."
                if is_timeout
                else "The coach couldn't answer right now. Please try again in a moment."
            ),
        ) from exc

    latency_ms = int((time.perf_counter() - t0) * 1000)
    text = (response.text or "").strip()
    usage = getattr(response, "usage_metadata", None)
    record.update(
        latency_ms=latency_ms,
        prompt_tokens=getattr(usage, "prompt_token_count", None),
        output_tokens=getattr(usage, "candidates_token_count", None),
        thinking_tokens=getattr(usage, "thoughts_token_count", None),
        response=text[:_LOG_TEXT_CAP],
    )

    try:
        parsed = schema.model_validate(json.loads(text))
    except (json.JSONDecodeError, ValidationError) as exc:
        record.update(ok=False, error=f"unparseable: {str(exc)[:300]}")
        _log(record)
        logger.error("gemini returned unparseable JSON for %s: %s", endpoint, text[:300])
        raise HTTPException(
            status_code=502,
            detail="The coach returned an answer we couldn't read. Please try again.",
        ) from exc

    record["ok"] = True
    _log(record)
    logger.info("gemini %s ok in %d ms", endpoint, latency_ms)
    return parsed
