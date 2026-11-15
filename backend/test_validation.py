import copy
import unittest

from validate_model import ROOT, VALIDATION, audit, read_json, run


class TestFrozenAudit(unittest.TestCase):
    def setUp(self):
        self.protocol = read_json(VALIDATION / "protocol.json")
        self.snapshot = read_json(VALIDATION / "cases.json")
        self.catalog = read_json(ROOT / "backend/data/mined_evidence.json")
        self.training = read_json(ROOT / "backend/data/psi_master.json")

    def perform_audit(self):
        return audit(self.protocol, self.snapshot, self.catalog, self.training)

    def test_frozen_audit_produces_zero_eligible_and_keeps_reused_specimen(self):
        result = run()
        self.assertEqual(result, read_json(VALIDATION / "results/summary.json"))
        for key in ("eligible_observations", "independent_runs", "independent_groups"):
            self.assertEqual(result[key], 0)
        self.assertEqual(result["status"], "insufficient_evidence")
        self.assertTrue(all(metric is None for metric in result["metrics"].values()))
        self.assertEqual(result["residuals"], [])
        self.assertEqual(result["shared_catalog_groups"]["saffire-i-fabric"], ["saffire-1-1-1", "saffire-1-1-2"])

    def test_eligibility_cannot_be_overridden_for_scoring(self):
        self.protocol["eligibility"]["eligible_ids"] = ["saffire-1-1-1"]
        with self.assertRaisesRegex(ValueError, "eligibility-only"):
            self.perform_audit()
        self.protocol["eligibility"]["eligible_ids"] = []
        self.snapshot["cases"][0]["classification"] = "eligible_benchmark"
        with self.assertRaisesRegex(ValueError, "eligibility-only"):
            self.perform_audit()

    def test_training_study_alias_must_be_excluded(self):
        alias = copy.deepcopy(self.training["records"][0])
        alias["experiment_id"] = "saffire-i-unknown-alias"
        self.training["records"].append(alias)
        with self.assertRaisesRegex(ValueError, "explicit exclusions"):
            self.perform_audit()

    def test_duplicate_disposition_is_rejected(self):
        self.snapshot["cases"].append(self.snapshot["cases"][0])
        with self.assertRaisesRegex(ValueError, "exactly one disposition"):
            self.perform_audit()

    def test_missing_exclusion_rationale_is_rejected(self):
        self.snapshot["cases"][0]["reasons"] = []
        with self.assertRaisesRegex(ValueError, "Missing exclusion basis"):
            self.perform_audit()
