"""Evidence packet, selection rule and server-built summary for POST /api/briefing."""
from __future__ import annotations

from export_evidence import eligible_outcome

GROUP_ORDER = ("compatible", "compatibility_unknown", "incompatible")
TOP_N = 3

GAP_TEXT = {
    "observation": "No reviewed NASA record near these conditions reports a measured outcome.",
    "relevance": "The closest records only describe test conditions, so the model cannot be checked against data here.",
    "limit": "Evidence gap: more testing is needed before relying on this scenario.",
}


def select_top(ranked):
    """First three ranker entries in group order; mirrors frontend/src/evidence/selectTop.ts."""
    picked = []
    for group in GROUP_ORDER:
        for entry in ranked["groups"][group]:
            picked.append({"group": group, **entry})
    return picked[:TOP_N]


def _by_id(catalog):
    return {record["id"]: record for record in catalog["records"]}


def _num(value):
    return f"{value:.3g}" if isinstance(value, (int, float)) else str(value)


def _fmt(value):
    return f"{_num(value[0])}–{_num(value[1])}" if isinstance(value, list) else _num(value)


def build_packet(catalog, ranked):
    records = _by_id(catalog)
    packet = []
    for entry in select_top(ranked):
        record = records[entry["id"]]
        packet.append({
            "id": record["id"],
            "title": record["title"],
            "match": entry["group"],
            "observations": [
                {"label": o["label"], "value": o["value"], "unit": o["unit"], "status": o["status"]}
                for o in record["observations"] if eligible_outcome(o)],
            # "reported" is in the normalized unit (the record's original value is converted),
            # and exact matches are dropped so they are not presented as differences.
            "condition_differences": [
                {"dimension": c["dimension"], "selected": c["selected"], "reported": c["normalized"],
                 "unit": c["unit"]} for c in entry["compared"] if c["delta"] != 0],
            "missing_dimensions": entry["missing_dimensions"],
            "limitations": record["limitations"],
        })
    return packet


def has_outcomes(packet):
    return any(item["observations"] for item in packet)


def resolve_citation(catalog, record_id):
    """Citation for a record, or None if it cannot be resolved.

    Uses the first observation's source when there is one, otherwise the first reference, so the
    briefing cites the same source and locator as the evidence card in the frontend.
    """
    try:
        record = _by_id(catalog)[record_id]
        observations = record["observations"]
        ref = observations[0]["source"] if observations else record["references"][0]
        source = catalog["sources"][ref["source_id"]]
    except (KeyError, IndexError, TypeError):
        return None
    return {"source_id": ref["source_id"], "title": source["title"], "locator": ref["locator"],
            "url": source["url"], "pdf_page": ref["pdf_page"], "printed_page": ref["printed_page"]}


def summary_fields(packet):
    """Deterministic Evidence summary from the top record, or the gap template."""
    if not packet or not has_outcomes(packet):
        record_id = packet[0]["id"] if packet else None
        return {key: {"text": text, "record_id": record_id} for key, text in GAP_TEXT.items()}
    top = next(item for item in packet if item["observations"])
    obs = top["observations"][0]
    unit = f" {obs['unit']}" if obs["unit"] else ""
    kind = "Measured" if obs["status"] == "measured" else "Derived from measurements"
    diffs = [f"{d['dimension']} {_fmt(d['reported'])} {d['unit']} vs {_num(d['selected'])} {d['unit']} selected"
             for d in top["condition_differences"]]
    note = {"compatible": "comparable context", "compatibility_unknown": "partial context match",
            "incompatible": "different context, reference only"}[top["match"]]
    relevance = f"{top['title']} is a {note}. " + (
        "Condition differences: " + "; ".join(diffs) + "." if diffs
        else "No reported numeric condition differs from the selected values.")
    if top["missing_dimensions"]:
        relevance += " Not reported: " + ", ".join(top["missing_dimensions"]) + "."
    limit = top["limitations"][0] if top["limitations"] else "Reported conditions may differ from this scenario."
    return {
        "observation": {"text": f"{kind}: {obs['label']} {_fmt(obs['value'])}{unit} in {top['title']}.",
                        "record_id": top["id"]},
        "relevance": {"text": relevance, "record_id": top["id"]},
        "limit": {"text": limit, "record_id": top["id"]},
    }
