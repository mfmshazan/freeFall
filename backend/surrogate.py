"""Experimental GP comparator on seed and estimated outcomes plus synthetic anchors.

The predictive standard deviations describe the fitted GP and have no measured coverage.
The Phase 4 audit retains this configuration for provenance. The serving API uses physics.py.
"""
from __future__ import annotations
import json
import math
import os
import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import Matern, WhiteKernel, ConstantKernel
from sklearn.preprocessing import StandardScaler

import physics

DATA = os.path.join(os.path.dirname(__file__), "data", "psi_master.json")

FUEL_FLAMM = {  # scalar encoding ~ flammability/sooting, keeps feature space compact
    "Methane_Gas": 0.1, "Heptane_Droplet": 0.5, "Kapton_Wire": 0.55,
    "Cotton_Fabric": 0.7, "PMMA_Acrylic": 0.9,
}
DIL_ENC = {"N2": 0.0, "CO2": 1.0, "He": 0.5}
TARGETS = ["spread_rate_mm_s", "flame_length_mm", "flame_width_mm"]


def _features(gravity_g, o2, psi, flow, diluent, fuel):
    return [gravity_g, o2, psi, flow, DIL_ENC[diluent], FUEL_FLAMM[fuel]]


class Surrogate:
    def __init__(self):
        self.records = json.load(open(DATA))["records"]
        X, Y = self._build_training()
        self.Xraw = X
        self.scaler = StandardScaler().fit(X)
        Xs = self.scaler.transform(X)

        kernel = (
            ConstantKernel(1.0, (1e-2, 1e2))
            * Matern(length_scale=np.ones(X.shape[1]), length_scale_bounds=(1e-1, 1e2), nu=2.5)
            + WhiteKernel(noise_level=0.1, noise_level_bounds=(1e-3, 1e1))
        )
        self.models = {}
        for j, name in enumerate(TARGETS):
            gp = GaussianProcessRegressor(
                kernel=kernel, normalize_y=True, n_restarts_optimizer=2, alpha=1e-6
            )
            gp.fit(Xs, Y[:, j])
            self.models[name] = gp

    def _build_training(self):
        X, Y = [], []
        # (1) seed outcomes and physics estimates for sourced conditions
        for r in self.records:
            X.append(_features(r["gravity_g"], r["o2_percent"], r["pressure_psi"],
                               r["airflow_cm_s"], r["diluent"], r["fuel_material"]))
            Y.append([r["spread_rate_mm_s"], r["flame_length_mm"], r["flame_width_mm"]])
        # (2) physics-informed synthetic anchors on a coarse grid (keeps GP bounded,
        #     but intentionally sparse in partial gravity so std stays high there)
        for g in (0.0, 1.0):                       # only flown-adjacent gravities get anchors
            for o2 in (15, 21, 30, 45, 60, 85):
                for psi_ in (6.0, 10.2, 14.7):
                    for flow in (0, 10, 25):
                        for fuel in ("Methane_Gas", "PMMA_Acrylic", "Cotton_Fabric"):
                            p = physics.predict(g, o2, psi_, flow, "N2", fuel)
                            X.append(_features(g, o2, psi_, flow, "N2", fuel))
                            Y.append([p["spread_rate_mm_s"], p["flame_length_mm"], p["flame_width_mm"]])
        return np.array(X, float), np.array(Y, float)

    def predict(self, gravity_g, o2, psi_, flow, diluent, fuel):
        x = np.array([_features(gravity_g, o2, psi_, flow, diluent, fuel)], float)
        xs = self.scaler.transform(x)
        mean, std = {}, {}
        for name, gp in self.models.items():
            m, s = gp.predict(xs, return_std=True)
            mean[name] = float(max(0.0, m[0]))
            std[name] = float(s[0])

        # anchor the non-GP outputs (geometry ratios, regime, soot) to the physics model
        phys = physics.predict(gravity_g, o2, psi_, flow, diluent, fuel)

        # distance to nearest training example or synthetic anchor (normalized)
        d_nn = self._nearest_distance(xs)
        return mean, std, phys, d_nn

    def _nearest_distance(self, xs):
        Xs = self.scaler.transform(self.Xraw)
        d = np.sqrt(((Xs - xs) ** 2).sum(axis=1))
        return float(d.min())
