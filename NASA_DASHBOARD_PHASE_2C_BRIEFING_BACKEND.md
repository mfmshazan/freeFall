# Phase 2C | Briefing backend (minutes 12–40)

Implements the backend half of "30–46 Add a live AI briefing" and the "Briefing contract" in [NASA_DASHBOARD_60_MINUTE_PLAN.md](NASA_DASHBOARD_60_MINUTE_PLAN.md). Requires [Phase 1](NASA_DASHBOARD_PHASE_1_FOUNDATION.md). Independent of 2A, 2B, 2D (the stub already answers `POST /api/briefing`).

**Owns:** `backend/briefing.py` (the Phase 1 router stub), `backend/briefing_packet.py`, `backend/test_briefing.py`. Does not edit `main.py`.

## Build

1. **Packet.** `rank_evidence` from `backend/evidence.py` on the loaded catalog (`export_evidence.load_catalog`), then `select_top`. Compact packet per record: id, observation text with status and unit, condition differences, limitations. If the packet has only conditions or missing outcomes, return the evidence-gap template without calling the provider.
2. **Provider call.** Key from the environment only; about 8 s timeout. Ask for `observation`, `relevance`, `limit`, each with a `record_id` from the packet. Keep measurements out of the model's job (qualitative synthesis only).
3. **Validate.** Check the JSON shape and that each `record_id` is in the packet; resolve citations server-side from the catalog; return text only.
4. **Fallback.** Any key/provider/timeout/validation failure returns `mode: 'summary'` built from the top record, never a 500. Successful calls return `mode: 'ai'`.
5. **Hygiene.** Never log the key, request bodies or prompts.

## Tests (`test_briefing.py`)

- Provider mocked: valid response, wrong record id, malformed JSON, timeout, missing key.
- Moon example selects the same IDs as the frontend `selectTop` for the same ranker output.
- Evidence-gap template path.
