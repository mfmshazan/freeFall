from copy import deepcopy
import json
from pathlib import Path
import unittest
from unittest.mock import patch

from evidence import rank_evidence
from export_evidence import load_catalog, validate_catalog, saffire_results


FIXTURES = json.loads((Path(__file__).parent / "data/evidence_fixtures.json").read_text())


def fixture_runs(catalog):
    synthetic = []
    for case in FIXTURES["synthetic_cases"]:
        fields = [{
            "label": spec["dimension"], "dimension": spec["dimension"], "unit": spec["unit"],
            "value": spec["value"], "original": spec["value"], "comparison_basis": spec["basis"],
            "basis": spec["basis"], "approximate": False, "status": spec.get("status", "reported_nominal"),
            "provisional": False, "time": spec.get("time", "unspecified"), "source": None,
        } for spec in case["fields"]]
        synthetic.append({**catalog["records"][0], "id": case["id"], "conditions": fields,
                          "observations": [], "specimen_group": None, "balance_gases": None})
    for fixture in FIXTURES["queries"]:
        records = {"empty": [], "synthetic": synthetic}.get(fixture.get("catalog"), catalog["records"])
        query = {"cabin": {**FIXTURES["cabin"], **fixture.get("cabin", {})}, "context": fixture.get("context", {})}
        yield fixture["id"], {**catalog, "records": records}, query


class EvidenceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = load_catalog(check_replays=True)
        cls.results = {id: rank_evidence(catalog, query) for id, catalog, query in fixture_runs(cls.catalog)}

    def get_match(self, fixture, id):
        return next((group, item) for group, matches in self.results[fixture]["groups"].items()
                    for item in matches if item["id"] == id)

    def test_catalog_validates_sources_and_provisional_fields(self):
        self.assertTrue({
            "saffire-1-1-1", "saffire-1-1-2", "LUCI-SIBAL-PARTIAL-G", "LUCI-SIBAL-1G",
            "PSI-159-21174C3", "PSI-69-248F001", "bass-ii-b1-147", "bass-ii-b3-148",
        }.issubset(record["id"] for record in self.catalog["records"]))
        self.assertEqual([item["spread_mm_s"] for item in saffire_results(self.catalog)["results"]], [1.8, 1.3])
        for field, value in [("provisional", True), ("source", None), ("unit", "units")]:
            with self.subTest(field=field):
                bad = deepcopy(self.catalog)
                bad["records"][0]["observations"][0][field] = value
                with self.assertRaises(ValueError):
                    validate_catalog(bad)
        bad = deepcopy(self.catalog)
        bad["records"].append(bad["records"][0])
        with self.assertRaisesRegex(ValueError, "Duplicate catalog ID"):
            validate_catalog(bad)

    def test_compatibility_and_outcome_definition(self):
        self.assertFalse(self.results["default"]["groups"]["compatible"])
        group, saffire = self.get_match("compatible-saffire", "saffire-1-1-1")
        self.assertEqual(group, "compatible")
        self.assertEqual(saffire["distance"], 0)
        group, opposed = self.get_match("compatible-saffire", "saffire-1-1-2")
        self.assertEqual(group, "incompatible")
        self.assertIn("flow_configuration", [x["field"] for x in opposed["reasons"]["conflicting"]])
        group, luci = self.get_match("unknown-luci", "LUCI-SIBAL-PARTIAL-G")
        self.assertEqual(group, "compatibility_unknown")
        self.assertEqual(luci["distance"], None)
        group, bass = self.get_match("bass-film-not-sphere", "bass-ii-b1-147")
        self.assertEqual(group, "incompatible")
        self.assertIn("geometry", [x["field"] for x in bass["reasons"]["conflicting"]])
        group, cfi = self.get_match("unsupported-cfi-feed", "PSI-159-21174C3")
        self.assertEqual(group, "incompatible")
        self.assertEqual(cfi["distance"], None)
        group, flex = self.get_match("unsupported-flex-mixture", "PSI-69-248F001")
        self.assertEqual(group, "incompatible")
        self.assertIn("balance_gas", [x["field"] for x in flex["reasons"]["conflicting"]])
        self.assertEqual(self.results["metric-with-no-matches"]["groups"]["compatible"], [])

    def test_coverage_counts_and_shared_specimen(self):
        coverage = self.results["compatible-saffire"]["coverage"]
        self.assertEqual(coverage["metrics"]["saffire_video_spread"]["compatible_derived"], 1)
        self.assertEqual(coverage["metrics"]["flame_base_spread_rate"]["compatible_derived"], 0)
        self.assertTrue({"bass-ii-b1-147", "bass-ii-b3-148"} <= set(coverage["condition_only"]))
        self.assertEqual(coverage["specimen_groups"]["saffire-i-fabric"], ["saffire-1-1-1", "saffire-1-1-2"])
        self.assertNotIn("generic_model_spread_rate", coverage["metrics"])
        self.assertTrue(all(not group for group in self.results["empty-catalog"]["groups"].values()))

    def test_api_response_keeps_explanation_and_counts(self):
        from evidence_api import EvidenceQuery, EvidenceResponse
        from main import evidence

        fixture = next(query for id, _, query in fixture_runs(self.catalog) if id == "compatible-saffire")
        actual = EvidenceResponse.model_validate(evidence(EvidenceQuery.model_validate(fixture)))
        self.assertEqual(actual.model_dump(mode="json"), self.results["compatible-saffire"])

    def test_unavailable_catalog_leaves_prediction_available(self):
        from fastapi import HTTPException
        from main import evidence, health, predict
        from evidence_api import CabinInputs, EvidenceQuery

        fixture = EvidenceQuery(cabin=CabinInputs(**FIXTURES["cabin"]))
        with patch("main.evidence_catalog", side_effect=FileNotFoundError), self.assertLogs("main"):
            with self.assertRaises(HTTPException) as raised:
                evidence(fixture)
            self.assertEqual(raised.exception.status_code, 503)
            self.assertEqual(health()["status"], "ok")
            self.assertIn("uncertainty", predict(fixture.cabin))

    def test_missing_values_intervals_units_and_ties(self):
        matches = self.results["ties-interval-units-and-missingness"]["groups"]["compatibility_unknown"]
        self.assertEqual([item["id"] for item in matches], [
            "inside-and-outside-interval", "tie-a", "tie-b", "no-comparable-dimensions"])
        self.assertAlmostEqual(matches[0]["distance"], (1/70)/(2**0.5))
        self.assertEqual(matches[0]["compared"][0]["reported"], [0.2, 0.23])
        self.assertEqual(matches[0]["compared"][1]["delta"], 0)
        self.assertEqual(matches[1]["distance"], 0)
        self.assertEqual(matches[2]["distance"], 0)
        self.assertIsNone(matches[3]["distance"])


if __name__ == "__main__":
    unittest.main()
