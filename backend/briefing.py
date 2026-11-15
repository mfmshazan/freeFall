"""POST /api/briefing: qualitative AI synthesis over the top evidence records, with a deterministic fallback."""
from __future__ import annotations

from functools import lru_cache
import json
import logging
import os
from pathlib import Path
import time
import urllib.error
import urllib.request
import uuid

from fastapi import APIRouter, Response
from pydantic import BaseModel

from briefing_packet import build_packet, has_outcomes, resolve_citation, select_top, summary_fields
from evidence import rank_evidence
from evidence_api import CabinInputs, EvidenceContext
from export_evidence import load_catalog

logger = logging.getLogger(__name__)
if not logger.handlers:  # uvicorn only configures its own loggers, so trace lines need a handler here
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(_handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False


def load_env_file(path=Path(__file__).with_name(".env")):
    """Load KEY=VALUE lines from backend/.env without overriding real environment variables."""
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            key, sep, value = line.strip().partition("=")
            if sep and key and not key.startswith("#"):
                os.environ.setdefault(key.strip(), value.strip().strip("\"'"))
    except OSError:
        pass


load_env_file()
router = APIRouter()

API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
API_REVISION = "2026-05-20"  # pins the Interactions API behaviour the docs examples use
DEFAULT_MODEL = "gemini-3.8-flash"  # stable; 2.5-flash is closed to new users; override with BRIEFING_MODEL
THINKING_LEVEL = "low"  # lowest level gemini-3.8-flash supports ("minimal" is not); override with BRIEFING_THINKING
TIMEOUT_S = 20
TRACE_HEADER = "X-Briefing-Trace"
FIELDS = ("observation", "relevance", "limit")
MAX_TEXT = 400

SYSTEM = (
    "You write a short qualitative briefing about NASA combustion experiments for a spacecraft-cabin "
    "fire-safety dashboard. Use only the evidence packet. Do not state or compute numbers, rates or "
    "predictions; the dashboard shows measurements separately. Never call a partial or different-context "
    "match a validation of the scenario. Fill observation, relevance and limit: each text is one sentence "
    "and each record_id is the id of the packet record it rests on."
)


class ProviderError(Exception):
    """A provider failure whose message is safe to log (no key, prompt or response text)."""


def response_schema(packet_ids):
    field = {"type": "object", "required": ["text", "record_id"], "properties": {
        "text": {"type": "string", "description": "One qualitative sentence, no numbers."},
        "record_id": {"type": "string", "enum": sorted(packet_ids)}}}
    return {"type": "object", "required": list(FIELDS), "properties": {key: field for key in FIELDS}}


def new_trace_id():
    return uuid.uuid4().hex[:12]


def trace(trace_id, event, **fields):
    """One greppable line per step: `briefing trace=<id> event=<name> k=v ...`."""
    logger.info("briefing trace=%s event=%s %s", trace_id, event,
                " ".join(f"{key}={value}" for key, value in fields.items()))


def provider_error_detail(error):
    """Google's error status and message from an HTTPError body, trimmed; never the request."""
    try:
        detail = json.loads(error.read() or b"{}").get("error", {})
        return detail.get("status", ""), str(detail.get("message", ""))[:200].replace("\n", " ")
    except (ValueError, AttributeError, OSError):
        return "", ""


def extract_text(payload):
    """The answer text from an Interaction, skipping thought steps; raises ProviderError otherwise."""
    status = payload.get("status")
    if status != "completed":
        raise ProviderError(f"interaction status {status}")
    texts = [block.get("text", "") for step in payload.get("steps", []) if step.get("type") == "model_output"
             for block in step.get("content", []) if block.get("type") == "text"]
    if not texts:
        raise ProviderError("interaction has no model_output text")
    return "".join(texts)


class BriefingRequest(BaseModel):
    scenario_key: str
    cabin: CabinInputs
    context: EvidenceContext | None = None


class BriefingField(BaseModel):
    text: str
    record_id: str | None
    citation: dict | None


class BriefingFields(BaseModel):
    observation: BriefingField
    relevance: BriefingField
    limit: BriefingField


class BriefingResponse(BaseModel):
    scenario_key: str
    mode: str  # "ai" | "summary"
    fields: BriefingFields


catalog_cached = lru_cache(maxsize=1)(load_catalog)


def call_provider(packet, api_key, trace_id=None):
    """One Gemini Interactions call. Logs a trace of each step; never the key, prompt or response text."""
    trace_id = trace_id or new_trace_id()
    model = os.environ.get("BRIEFING_MODEL", DEFAULT_MODEL)
    thinking = os.environ.get("BRIEFING_THINKING", THINKING_LEVEL)
    ids = {item["id"] for item in packet}
    body = json.dumps({
        "model": model,
        "system_instruction": SYSTEM,
        "input": json.dumps({"packet": packet}),
        # Thinking tokens count against max_output_tokens, so leave headroom for the JSON answer.
        "generation_config": {"thinking_level": thinking, "max_output_tokens": 2000},
        "response_format": {"type": "text", "mime_type": "application/json", "schema": response_schema(ids)},
        "store": False,  # no server-side retention of the packet or answer
    }).encode()
    request = urllib.request.Request(API_URL, data=body, headers={
        "x-goog-api-key": api_key, "content-type": "application/json", "api-revision": API_REVISION})
    started = time.monotonic()
    elapsed = lambda: f"{(time.monotonic() - started) * 1000:.0f}ms"  # noqa: E731
    deadline = started + TIMEOUT_S  # total budget; the socket timeout only bounds each operation
    trace(trace_id, "request", model=model, thinking=thinking, records=len(packet), bytes=len(body),
          timeout_s=TIMEOUT_S)
    phase = "connect"
    try:
        chunks = []
        with urllib.request.urlopen(request, timeout=TIMEOUT_S) as response:  # noqa: S310 fixed https URL
            phase = "read"
            trace(trace_id, "headers", http=response.status, after=elapsed())
            while chunk := response.read(8192):
                chunks.append(chunk)
                if time.monotonic() > deadline:
                    raise TimeoutError("provider response exceeded the time budget")
        phase = "parse"
        payload = json.loads(b"".join(chunks))
        usage = payload.get("usage", {})
        trace(trace_id, "response", interaction=payload.get("id"), status=payload.get("status"),
              steps=",".join(step.get("type", "?") for step in payload.get("steps", [])),
              input_tokens=usage.get("total_input_tokens"), thought_tokens=usage.get("total_thought_tokens"),
              output_tokens=usage.get("total_output_tokens"), after=elapsed())
        return extract_text(payload)
    except urllib.error.HTTPError as error:
        status, message = provider_error_detail(error)
        trace(trace_id, "failed", phase=phase, http=error.code, google_status=status or "-", after=elapsed(),
              message=repr(message))
        raise ProviderError(f"http {error.code} {status}".strip()) from None
    except Exception as error:
        trace(trace_id, "failed", phase=phase, error=type(error).__name__, detail=repr(str(error)[:200]),
              after=elapsed())
        raise


def parse_fields(raw, packet_ids):
    """Return {field: {text, record_id}} or None if shape or IDs are invalid."""
    try:
        data = json.loads(raw.strip().removeprefix("```json").removesuffix("```").strip())
        out = {}
        for key in FIELDS:
            item = data[key]
            text, record_id = item["text"], item["record_id"]
            if (not isinstance(text, str) or not text.strip() or len(text) > MAX_TEXT
                    or record_id not in packet_ids):
                return None
            out[key] = {"text": text.strip(), "record_id": record_id}
        return out
    except (ValueError, KeyError, TypeError, AttributeError):
        return None


def with_citations(catalog, fields):
    return {key: {**value, "citation": resolve_citation(catalog, value["record_id"]) if value["record_id"] else None}
            for key, value in fields.items()}


def make_briefing(request, catalog, trace_id=None):
    query = {"cabin": request.cabin.model_dump(), "context": request.context.model_dump() if request.context else {}}
    packet = build_packet(catalog, rank_evidence(catalog, query))
    fields, mode = summary_fields(packet), "summary"
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key and has_outcomes(packet):
        try:
            parsed = parse_fields(call_provider(packet, api_key, trace_id), {item["id"] for item in packet})
        except Exception as exc:  # timeout, network, HTTP or shape errors all fall back
            logger.warning("Briefing provider failed: trace=%s %s: %s", trace_id, type(exc).__name__,
                           exc if isinstance(exc, ProviderError) else "")
            parsed = None
        if parsed:
            fields, mode = parsed, "ai"
        elif parsed is None:
            trace(trace_id, "fallback", reason="provider failed or answer rejected by parse_fields")
    return {"scenario_key": request.scenario_key, "mode": mode, "fields": with_citations(catalog, fields)}


@router.post("/api/briefing", response_model=BriefingResponse)
def briefing(request: BriefingRequest, response: Response = None):
    trace_id = new_trace_id()
    if response is not None:
        response.headers[TRACE_HEADER] = trace_id  # match a browser request to its server log lines
    try:
        catalog = catalog_cached()
    except (OSError, KeyError, TypeError, ValueError):
        logger.exception("Unable to load the reviewed evidence catalog")
        return {"scenario_key": request.scenario_key, "mode": "summary", "fields": {
            key: {"text": text, "record_id": None, "citation": None} for key, text in {
                "observation": "Evidence catalog unavailable.", "relevance": "No briefing can be built.",
                "limit": "More testing needed."}.items()}}
    try:
        return make_briefing(request, catalog, trace_id)
    except Exception:  # never a 500: fall back to the deterministic summary below
        logger.exception("Briefing failed; returning fallback (trace=%s)", trace_id)
        return {"scenario_key": request.scenario_key, "mode": "summary", "fields": {
            key: {"text": text, "record_id": None, "citation": None} for key, text in {
                "observation": "Briefing unavailable.", "relevance": "No briefing can be built for this scenario.",
                "limit": "More testing needed."}.items()}}
