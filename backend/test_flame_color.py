import json
import unittest

from flame_color import FlameColorModel, CLASSES


class FlameColorModelTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = FlameColorModel()

    def test_predict_contract(self):
        r = self.model.predict(40, "Methane_Gas")
        self.assertIn(r["label"], CLASSES)
        self.assertAlmostEqual(r["p_blue"] + r["p_mixed"] + r["p_yellow"], 1.0, places=2)
        self.assertTrue(r["hex"].startswith("#") and len(r["hex"]) == 7)
        self.assertGreaterEqual(r["soot_equivalent"], 0.0)
        self.assertLessEqual(r["soot_equivalent"], 1.0)
        self.assertGreater(r["est_flame_temp_k"], 1000)

    def test_high_oxygen_is_bluer_than_low_oxygen(self):
        """Learned trend: raising O2 lowers the sooting (yellow) probability."""
        low = self.model.predict(16, "Methane_Gas")
        high = self.model.predict(45, "Methane_Gas")
        self.assertLess(high["soot_equivalent"], low["soot_equivalent"])

    def test_solid_fuel_is_flagged_extrapolated(self):
        """CFI-G only covers gases, so sooty solids must be flagged and damped."""
        solid = self.model.predict(21, "PMMA_Acrylic")
        gas = self.model.predict(21, "Methane_Gas")
        self.assertTrue(solid["extrapolated"])
        self.assertFalse(gas["extrapolated"])

    def test_catalog_counts_match_training(self):
        blob = json.load(open(self.model_data_path(), encoding="utf-8"))
        self.assertEqual(blob["counts"]["total"], len(blob["records"]))
        self.assertGreaterEqual(blob["counts"]["blue"], 1)

    @staticmethod
    def model_data_path():
        import flame_color
        return flame_color.DATA


if __name__ == "__main__":
    unittest.main()
