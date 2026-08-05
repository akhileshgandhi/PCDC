"""Central LLM provider configuration.

Lets the app swap between OpenAI and Google Gemini (via Gemini's
OpenAI-compatible endpoint) with only .env changes. Set AI_PROVIDER=gemini to
use Gemini; anything else defaults to OpenAI.
"""

import json
import os
from typing import Any, Dict, Optional

from openai import OpenAI

GEMINI_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_DEFAULT_MODEL = "gemini-flash-latest"
OPENAI_DEFAULT_MODEL = "gpt-4o-mini"


def ai_provider() -> str:
    return os.getenv("AI_PROVIDER", "openai").strip().lower()


def is_gemini() -> bool:
    return ai_provider() == "gemini"


def get_llm_client() -> OpenAI:
    """Return an OpenAI-compatible client for the active provider."""
    if is_gemini():
        key = os.getenv("GEMINI_API_KEY")
        if not key:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        return OpenAI(
            api_key=key,
            base_url=os.getenv("GEMINI_BASE_URL", GEMINI_DEFAULT_BASE_URL),
        )
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return OpenAI(api_key=key)


def get_llm_model(default: Optional[str] = None) -> str:
    if is_gemini():
        return os.getenv("GEMINI_MODEL", GEMINI_DEFAULT_MODEL)
    return os.getenv("OPENAI_MODEL", default or OPENAI_DEFAULT_MODEL)


def json_response_format(schema: Dict[str, Any], name: str) -> Dict[str, Any]:
    """Provider-appropriate response_format for forced-JSON generation.

    Gemini's OpenAI-compat endpoint is unreliable with strict json_schema, but
    handles the simpler json_object mode well, so we use that for Gemini and the
    strict schema for OpenAI. Callers must still parse the content defensively.
    """
    if is_gemini():
        return {"type": "json_object"}
    return {
        "type": "json_schema",
        "json_schema": {"name": name, "strict": True, "schema": schema},
    }


def parse_json_content(content: Optional[str]) -> Any:
    """Parse a model's JSON content tolerantly.

    Handles clean JSON, markdown-fenced JSON (```json ... ```), and JSON
    embedded in surrounding prose (Gemini sometimes adds a preamble).
    """
    if not content:
        raise ValueError("Model returned an empty response")
    text = content.strip()
    if text.startswith("```"):
        # Strip a leading ```json / ``` fence and the trailing fence.
        text = text.split("```", 2)[1] if text.count("```") >= 2 else text.strip("`")
        if text.lstrip().lower().startswith("json"):
            text = text.lstrip()[4:]
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        for open_ch, close_ch in (("{", "}"), ("[", "]")):
            start = text.find(open_ch)
            end = text.rfind(close_ch)
            if start >= 0 and end > start:
                return json.loads(text[start : end + 1])
    raise ValueError("Model did not return valid JSON")
