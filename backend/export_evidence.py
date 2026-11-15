"""Validate the curated catalog and regenerate its two frontend assets."""
from __future__ import annotations

import argparse
from datetime import date
import json
import math
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "backend/data/mined_evidence.json"
FRONTEND = ROOT / "frontend"
STATUSES = {"measured", "derived_from_measurements", "reported_nominal", "assumed", "missing"}
OUTCOME_STATUSES = {"measured", "derived_from_measurements"}
CONTEXT_KEYS = ("fuel_phase", "material", "geometry", "flow_configuration", "apparatus")
DIMENSION_BASES = {
    "gravity_g": "acceleration_g",
    "o2_percent": "mole_fraction",
    "pressure_psi": "absolute_pressure",
    "airflow_cm_s": "duct_velocity",
}
UNITS = {None, "cm", "mm", "µm", "cm/s", "m/s", "mm/s", "mm²/s", "%", "ppm",
         "mole fraction", "volume fraction", "psia", "kPa", "bar", "mmHg", "g", "mg/s", "s"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def number(value):
    return type(value) in (float, int) and math.isfinite(value)


def eligible_outcome(field):
    return field["status"] in OUTCOME_STATUSES and not field["provisional"] and field["value"] is not None


def eligible_condition(field, dimension):
    return (field["dimension"] == dimension and field.get("comparison_basis") == DIMENSION_BASES[dimension]
            and not field["provisional"] and field["status"] not in {"missing", "assumed"}
            and field["time"] in {"unspecified", "initial"}
            and (number(field["value"]) or isinstance(field["value"], list)))


def validate_catalog(catalog, *, check_replays=False):
    require(catalog["schema_version"] == 1 and bool(catalog["catalog_version"]), "Unknown catalog schema/version")
    ranking = catalog["ranking"]
    require(ranking["comparison_bases"] == DIMENSION_BASES, "Invalid comparison bases")
    require(set(ranking["dimensions"]) == set(DIMENSION_BASES), "Missing or unknown ranking dimension")
    for dimension, config in ranking["dimensions"].items():
        require(all(number(x) and x > 0 for x in [config["scale"], config["weight"], *config["conversions"].values()]),
                f"{dimension}: invalid ranking scale, weight or conversion")
        require(config["unit"] in UNITS and config["unit"] in config["conversions"], f"{dimension}: invalid unit")

    sources = catalog["sources"]
    for key, source in sources.items():
        url = urlsplit(source["url"])
        require(url.scheme == "https" and url.hostname and
                (url.hostname == "nasa.gov" or url.hostname.endswith(".nasa.gov")), f"{key}: invalid NASA URL")
        require(all(source[k] for k in ("title", "filename", "version", "access")), f"{key}: incomplete citation")
        require(source["sha256"] is None or re.fullmatch(r"[0-9a-f]{64}", source["sha256"]), f"{key}: invalid hash")
        date.fromisoformat(source["reviewed_on"])

    def reference(ref):
        require(ref["source_id"] in sources and ref["locator"].strip(), f"Invalid source locator: {ref}")
        for key in ("pdf_page", "printed_page"):
            require(ref[key] is None or type(ref[key]) is int and ref[key] > 0, f"Invalid page: {ref}")

    ids = {record["id"] for record in catalog["records"]}
    require(len(ids) == len(catalog["records"]), "Duplicate catalog ID")
    source_cases = set()
    metric_definitions = {}
    for record in catalog["records"]:
        case = record["id"]
        require(re.fullmatch(r"[A-Za-z0-9-]+", case) and record["use"] == "evidence_only", f"{case}: invalid ID/use")
        require(set(record["context"]) == set(CONTEXT_KEYS), f"{case}: incomplete context")
        require(all(value is None or re.fullmatch(r"[a-z0-9-]+", value) for value in record["context"].values()),
                f"{case}: invalid context key")
        require(set(record["related"]) <= ids - {case}, f"{case}: invalid related case")
        require(record["references"] and record["limitations"], f"{case}: missing references or limitations")
        for ref in record["references"]:
            reference(ref)
        identity = record["identity"]
        require(type(identity["catalog_id_assigned_locally"]) is bool and isinstance(identity["aliases"], list)
                and all(k in identity for k in ("run", "sample", "hardware")), f"{case}: invalid identity")
        if identity["run"]:
            key = (record["study"], identity["run"])
            require(key not in source_cases, f"{case}: duplicate source run")
            source_cases.add(key)

        for field in [*record["conditions"], *record["observations"]]:
            label, value = field["label"], field["value"]
            prefix = f"{case} / {label}"
            require(field["status"] in STATUSES and field["unit"] in UNITS, f"{prefix}: invalid status or units")
            require((field["status"] == "missing") == (value is None), f"{prefix}: missing status must match null")
            require(type(field["approximate"]) is bool and type(field["provisional"]) is bool and
                    field["basis"].strip() and field["time"].strip(), f"{prefix}: invalid basis or qualifiers")
            require(not field["provisional"] or field["status"] not in OUTCOME_STATUSES,
                    f"{prefix}: provisional field cannot be marked measured")
            require(value is None or isinstance(value, (str, bool, list)) or number(value), f"{prefix}: invalid value")
            if isinstance(value, list):
                require(len(value) == 2 and all(map(number, value)) and value[0] <= value[1],
                        f"{prefix}: invalid interval")
            if value is not None:
                require(field["original"] is not None and field["source"] is not None, f"{prefix}: missing provenance")
                reference(field["source"])
            if dimension := field["dimension"]:
                require(dimension in DIMENSION_BASES and eligible_condition(field, dimension)
                        and field["unit"] in ranking["dimensions"][dimension]["conversions"],
                        f"{prefix}: non-commensurate numeric match field")

        metrics = set()
        for field in record["observations"]:
            require(field["source"] is not None, f"{case}: observation needs a locator")
            require(field["metric"] not in metrics and field["feature"] and field["method"] and field["definition"],
                    f"{case}: duplicate or undefined metric")
            metrics.add(field["metric"])
            definition = (field["definition"], field["unit"])
            require(metric_definitions.setdefault(field["metric"], definition) == definition,
                    f"{case}: inconsistent metric definition/units")

        if check_replays and (replay := record["replay"]):
            require(replay["view"] in {"replay", "bass2"}, f"{case}: invalid replay view")
            for key in ("video", "proof_sheet"):
                if path := replay[key]:
                    require(path.startswith("/replay/") and ".." not in path and (FRONTEND / "public" / path[1:]).is_file(),
                            f"{case}: missing replay asset {path}")

    return catalog


def load_catalog(*, check_replays=False):
    return validate_catalog(json.loads(CATALOG.read_text(encoding="utf-8")), check_replays=check_replays)


def saffire_results(catalog):
    by_id = {record["id"]: record for record in catalog["records"]}
    runs = [by_id[f"saffire-1-{run}"] for run in ("1-1", "1-2")]
    first = runs[0]
    fields = {field["label"]: field["value"] for field in first["conditions"]}
    obs = next(x for x in first["observations"] if x["metric"] == "saffire_video_spread")
    ref = obs["source"]
    return {
        "source_url": f"{catalog['sources'][ref['source_id']]['url']}#page={ref['pdf_page']}",
        "report_page": ref["pdf_page"],
        "material": fields["Material"],
        "gravity": fields["Gravity"].lower(),
        "nominal_duct_flow_cm_s": fields["Nominal duct air speed"],
        "metric": obs["definition"],
        "results": [{"run_id": record["identity"]["run"], "direction": record["context"]["flow_configuration"],
                     "spread_mm_s": next(x["value"] for x in record["observations"] if x["metric"] == obs["metric"])}
                    for record in runs],
        "caveat": "The opposed pass used fabric remaining after the concurrent pass, so the comparison does not isolate "
                  "flow direction. The replay shows a partial image window from the concurrent run. The opposed value "
                  "comes from the report. Neither rate is an instantaneous cursor reading.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if a generated asset is missing or stale")
    args = parser.parse_args()
    try:
        catalog = load_catalog(check_replays=True)
        exports = {
            FRONTEND / "src/data/evidence_catalog.json": catalog,
            FRONTEND / "public/replay/saffire-1/report-results.json": saffire_results(catalog),
        }
        for path, data in exports.items():
            content = json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
            if args.check:
                require(path.is_file() and path.read_text(encoding="utf-8") == content,
                        f"Stale export: {path.relative_to(ROOT)}. Run python3 backend/export_evidence.py.")
            else:
                path.write_text(content, encoding="utf-8")
    except (OSError, KeyError, TypeError, ValueError) as error:
        parser.exit(1, f"Evidence export: {error}\n")
    print(f"Evidence catalog {catalog['catalog_version']}: {len(catalog['records'])} cases and {len(exports)} assets "
          f"{'checked' if args.check else 'exported'}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
