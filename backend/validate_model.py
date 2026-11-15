"""Reproduce the Phase 4 eligibility audit without loading either predictor."""
import argparse
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VALIDATION = ROOT / "backend/validation"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def audit(protocol, snapshot, catalog, training):
    cases = snapshot["cases"]
    records = {record["id"]: record for record in catalog["records"]}
    case_ids = {case["catalog_id"] for case in cases}
    if protocol["version"] != snapshot["version"] or catalog["catalog_version"] != snapshot["catalog_version"]:
        raise ValueError("Protocol, snapshot or catalog version mismatch")
    if len(case_ids) != len(cases) or case_ids != records.keys():
        raise ValueError("Each catalog record must have exactly one disposition")

    required_exclusions = {
        row["experiment_id"] for row in training["records"]
        if row["experiment_id"].casefold().startswith("saffire-")
    }
    if set(protocol["known_training_exclusions"]) != required_exclusions:
        raise ValueError("Related Saffire training rows require explicit exclusions")

    if protocol["eligibility"]["eligible_ids"] or any(case["classification"] != "excluded" for case in cases):
        raise ValueError("This frozen protocol is eligibility-only. New candidates require a revised protocol.")

    groups = {}
    for case in cases:
        record = records[case["catalog_id"]]
        if not case["reasons"] or not case["note"]:
            raise ValueError(f"Missing exclusion basis for {record['id']}")
        specimen = record.get("specimen_group")
        if specimen:
            groups.setdefault(specimen, []).append(record["id"])

    study_counts = Counter(case["stratum"] for case in cases)
    return {
        "protocol_version": protocol["version"],
        "catalog_version": catalog["catalog_version"],
        "status": "insufficient_evidence",
        "model": protocol["models"]["runtime_default"],
        "target": protocol["target"]["label"],
        "target_unit": protocol["target"]["unit"],
        "eligible_observations": 0,
        "independent_runs": 0,
        "independent_groups": 0,
        "reviewed_catalog_cases": len(cases),
        "excluded_cases_by_stratum": dict(sorted(study_counts.items())),
        "shared_catalog_groups": groups,
        "metrics": {"mae_mm_s": None, "signed_bias_mm_s": None, "paired_absolute_error_difference_mm_s": None},
        "residuals": [],
        "source_url": catalog["sources"]["saffire-report"]["url"] + "#page=29",
    }


def run():
    manifest = read_json(VALIDATION / "manifest.json")
    for name, expected in manifest["sha256"].items():
        if sha256((ROOT / name).read_bytes()).hexdigest() != expected:
            raise ValueError(f"Hash mismatch for frozen file {name}")
    return audit(
        read_json(VALIDATION / "protocol.json"),
        read_json(VALIDATION / "cases.json"),
        read_json(ROOT / "backend/data/mined_evidence.json"),
        read_json(ROOT / "backend/data/psi_master.json"),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="compare against the bundled summary")
    args = parser.parse_args()
    result = json.dumps(run(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if result != (VALIDATION / "results/summary.json").read_text(encoding="utf-8"):
            parser.exit(1, "The bundled validation summary is out of date.\n")
    else:
        print(result, end="")
