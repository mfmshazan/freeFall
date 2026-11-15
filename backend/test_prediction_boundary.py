import json
import unittest

import main
import physics


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

    def test_api_uses_physics_sphere_and_flow_geometry(self):
        values = dict(gravity_g=0, o2_percent=21, pressure_psi=14.7,
                      airflow_cm_s=0, diluent="N2", fuel_material="Methane_Gas")
        still = main.predict(main.CabinInputs(**values))
        self.assertEqual(still["prediction"]["aspect_ratio_LD"], 1)
        self.assertEqual(still["prediction"]["flame_length_mm"], still["prediction"]["flame_width_mm"])
        self.assertEqual(still["model"], main.health()["model"])
        self.assertEqual(still["uncertainty"]["trust_status"], "EXPLORATORY")
        self.assertIsNone(still["uncertainty"]["safety_margin_multiplier"])
        values["airflow_cm_s"] = 5
        flowing = main.predict(main.CabinInputs(**values))["prediction"]
        self.assertEqual(flowing, physics.predict(**values))
        self.assertGreater(flowing["aspect_ratio_LD"], 1)

    def test_planet_orbit_surface_and_altitude_gravity(self):
        # 1. Mercury default free_orbit -> 0g spherical flame
        res_orbit = main.predict(main.CabinInputs(
            gravity_g=0.0, o2_percent=21, pressure_psi=14.7,
            airflow_cm_s=0, diluent="N2", fuel_material="Cotton_Fabric",
            world="mercury", gravity_mode="free_orbit"
        ))
        self.assertEqual(res_orbit["planet_telemetry"]["effective_gravity_g"], 0.0)
        self.assertEqual(res_orbit["prediction"]["aspect_ratio_LD"], 1.0)

        # 2. Mercury surface -> 0.38g partial gravity
        res_surf = main.predict(main.CabinInputs(
            gravity_g=0.38, o2_percent=21, pressure_psi=14.7,
            airflow_cm_s=0, diluent="N2", fuel_material="Cotton_Fabric",
            world="mercury", gravity_mode="surface"
        ))
        self.assertEqual(res_surf["planet_telemetry"]["effective_gravity_g"], 0.38)
        self.assertGreater(res_surf["prediction"]["aspect_ratio_LD"], 1.0)
        self.assertEqual(res_surf["uncertainty"]["trust_status"], "CAUTION_EXTRAPOLATING")

        # 3. Mercury intermediate altitude (e.g. 1 R = 2439.7 km -> 0.38 / 4 = 0.095 g)
        res_alt = main.predict(main.CabinInputs(
            gravity_g=0.0, o2_percent=21, pressure_psi=14.7,
            airflow_cm_s=0, diluent="N2", fuel_material="Cotton_Fabric",
            world="mercury", altitude_km=2439.7, gravity_mode="altitude"
        ))
        self.assertAlmostEqual(res_alt["planet_telemetry"]["effective_gravity_g"], 0.095, places=3)

        # 4. Mercury max orbit -> 0g
        res_max = main.predict(main.CabinInputs(
            gravity_g=0.0, o2_percent=21, pressure_psi=14.7,
            airflow_cm_s=0, diluent="N2", fuel_material="Cotton_Fabric",
            world="mercury", gravity_mode="max_orbit"
        ))
        self.assertEqual(res_max["planet_telemetry"]["effective_gravity_g"], 0.0)
        self.assertEqual(res_max["prediction"]["aspect_ratio_LD"], 1.0)


if __name__ == "__main__":
    unittest.main()
