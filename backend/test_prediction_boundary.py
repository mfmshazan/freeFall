import unittest
from unittest.mock import patch

import main


class PredictionBoundaryTest(unittest.TestCase):
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
