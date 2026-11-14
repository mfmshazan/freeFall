import json
import unittest
from unittest.mock import patch

import main


class PredictionRouteTest(unittest.IsolatedAsyncioTestCase):
    async def test_former_trigger_over_http_contract(self):
        body = json.dumps(dict(gravity_g=0, o2_percent=85, pressure_psi=4.3, airflow_cm_s=0,
                               diluent="N2", fuel_material="Methane_Gas")).encode()
        messages = []

        async def receive():
            return {"type": "http.request", "body": body}

        async def send(message):
            messages.append(message)

        await main.app({
            "type": "http", "method": "POST", "path": "/api/predict", "root_path": "",
            "scheme": "http", "query_string": b"", "headers": [(b"content-type", b"application/json")],
        }, receive, send)
        self.assertEqual(messages[0]["status"], 200)
        prediction = json.loads(messages[1]["body"])["prediction"]
        self.assertEqual(prediction["visual_regime"], "SOOT_FREE_BLUE_SPHERE")
        self.assertEqual(prediction["aspect_ratio_LD"], 1)
        self.assertEqual(prediction["flame_length_mm"], prediction["flame_width_mm"])


class PredictionBoundaryTest(unittest.TestCase):
    def test_api_uses_current_appearance_at_former_cool_flame_threshold(self):
        for oxygen, pressure in [(85, 4.3), (59.9, 7), (60, 6.9), (60, 7), (60, 7.1), (60.1, 7)]:
            with self.subTest(oxygen=oxygen, pressure=pressure):
                inputs = main.CabinInputs(gravity_g=0, o2_percent=oxygen, pressure_psi=pressure,
                                          airflow_cm_s=0, diluent="N2", fuel_material="Methane_Gas")
                result = main.predict(inputs)
                prediction = result["prediction"]
                self.assertEqual(prediction["visual_regime"], "SOOT_FREE_BLUE_SPHERE")
                self.assertEqual(prediction["aspect_ratio_LD"], 1)
                self.assertEqual(prediction["flame_length_mm"], prediction["flame_width_mm"])
                self.assertEqual(result["engineering_playbook"], [])

    def test_still_air_uses_physical_sphere_but_flow_keeps_gp_geometry(self):
        mean = {"spread_rate_mm_s": 1, "flame_length_mm": 30, "flame_width_mm": 10}
        std = {"spread_rate_mm_s": 0.1, "flame_length_mm": 2, "flame_width_mm": 1}
        phys = {"flame_length_mm": 16, "flame_width_mm": 16,
                "standoff_distance_mm": 2, "aspect_ratio_LD": 1,
                "soot_fraction": 0.1, "radiometric_flux_kw_m2": 1,
                "visual_regime": "SOOT_FREE_BLUE_SPHERE"}
        values = dict(gravity_g=0, o2_percent=21, pressure_psi=14.7,
                      airflow_cm_s=0, diluent="N2", fuel_material="Methane_Gas")
        with patch.object(main.SURROGATE, "predict", return_value=(mean, std, phys, 0.1)):
            still = main.predict(main.CabinInputs(**values))["prediction"]
            self.assertEqual((still["flame_length_mm"], still["flame_width_mm"], still["aspect_ratio_LD"]), (16, 16, 1))
            values["airflow_cm_s"] = 5
            flowing = main.predict(main.CabinInputs(**values))["prediction"]
            self.assertEqual((flowing["flame_length_mm"], flowing["flame_width_mm"]), (30, 10))


if __name__ == "__main__":
    unittest.main()
