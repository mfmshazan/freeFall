"""Compatibility and condition distance for the reviewed evidence catalog."""
from __future__ import annotations

import math

from export_evidence import eligible_condition, eligible_outcome

CONTEXT_FILTERS = ("material", "geometry", "flow_configuration", "apparatus")


def _compatibility(record, query, ranking):
    cabin = query["cabin"]
    filters = query.get("context") or {}
    context = record["context"]
    metric = filters.get("metric")
    matching, missing, conflicting = [], [], []

    def compare(field, requested, reported):
        detail = {"field": field, "requested": requested, "reported": reported}
        if requested is None or reported is None or reported == []:
            missing.append(detail)
        elif requested in (reported if isinstance(reported, list) else [reported]):
            matching.append(detail)
        else:
            conflicting.append(detail)

    compare("fuel_phase", ranking["fuel_phases"][cabin["fuel_material"]], context["fuel_phase"])
    for field in CONTEXT_FILTERS:
        compare(field, filters.get(field), context[field])
    if context["material"] in ranking["material_families"]:
        compare("cabin_fuel_family", cabin["fuel_material"], ranking["material_families"][context["material"]]
                or ["outside-predictor-fuels"])
    else:
        compare("cabin_fuel_family", cabin["fuel_material"], None)
    if balance := record.get("balance_gases"):
        compare("balance_gas", cabin["diluent"], balance if len(balance) == 1 else ["mixed-balance-gases"])
    compare("metric", metric, [obs["metric"] for obs in record["observations"] if eligible_outcome(obs)] or None)
    return {"matching": matching, "missing": missing, "conflicting": conflicting}


def _condition_distance(record, cabin, dimensions):
    compared, missing = [], []
    weighted_squares, weight_sum = 0.0, 0.0
    for dimension, config in dimensions.items():
        fields = [field for field in record["conditions"] if eligible_condition(field, dimension)]
        if len(fields) != 1 or fields[0]["unit"] not in config["conversions"]:
            missing.append(dimension)
            continue

        field = fields[0]
        factor = config["conversions"][field["unit"]]
        value = field["value"]
        normalized = [bound * factor for bound in value] if isinstance(value, list) else value * factor
        lo, hi = normalized if isinstance(normalized, list) else (normalized, normalized)
        selected = cabin[dimension]
        delta = selected - lo if selected < lo else selected - hi if selected > hi else 0.0
        weight = config["weight"]
        weighted_squares += weight * (delta / config["scale"]) ** 2
        weight_sum += weight
        compared.append({
            "dimension": dimension, "selected": selected, "reported": value,
            "original": field["original"], "original_unit": field["unit"],
            "normalized": normalized, "unit": config["unit"], "factor": factor,
            "delta": delta, "status": field["status"], "basis": field["basis"],
            "time": field["time"], "approximate": field["approximate"], "source": field["source"],
        })

    return {
        "compared": compared, "missing_dimensions": missing,
        "distance": math.sqrt(weighted_squares / weight_sum) if weight_sum else None,
    }


def rank_evidence(catalog, query):
    ranking = catalog["ranking"]
    groups = {"compatible": [], "compatibility_unknown": [], "incompatible": []}
    coverage = {"metrics": {}, "condition_only": [], "specimen_groups": {}}
    for record in catalog["records"]:
        reasons = _compatibility(record, query, ranking)
        group = ("incompatible" if reasons["conflicting"] else
                 "compatibility_unknown" if reasons["missing"] else "compatible")
        entry = {
            "id": record["id"], "reasons": reasons,
            **_condition_distance(record, query["cabin"], ranking["dimensions"]),
        }
        groups[group].append(entry)
        if specimen := record["specimen_group"]:
            coverage["specimen_groups"].setdefault(specimen, []).append(record["id"])
        if not record["observations"]:
            coverage["condition_only"].append(record["id"])
        for obs in record["observations"]:
            if not eligible_outcome(obs):
                continue
            metric = coverage["metrics"].setdefault(obs["metric"], {
                "compatible_measured": 0, "compatible_derived": 0, "partial_context": 0,
                "incompatible": 0,
            })
            if group == "compatible" and obs["metric"] != (query.get("context") or {}).get("metric"):
                key = "incompatible"
            elif group == "compatible":
                key = "compatible_measured" if obs["status"] == "measured" else "compatible_derived"
            else:
                key = "partial_context" if group == "compatibility_unknown" else "incompatible"
            metric[key] += 1

    for matches in groups.values():
        matches.sort(key=lambda match: (-len(match["compared"]),
                     match["distance"] if match["distance"] is not None else math.inf, match["id"]))
    return {"catalog_version": catalog["catalog_version"], "ranking_version": ranking["version"],
            "groups": groups, "coverage": coverage}
