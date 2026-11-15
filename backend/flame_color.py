"""Flame-color model trained on the NASA ACME CFI-G inverse-flame observations.

Two small models, trained once at startup from data/flame_color_master.json
(produced by ingest_flame_color.py):

  1. A Gaussian-Process *classifier* mapping
        [oxygen_fraction, flame_temp_K, sooting_index] -> {blue, yellow, mixed}
     with calibrated class probabilities. Blue = soot-free premixed-like burning,
     yellow = sooting diffusion flame, mixed = yellow-tipped / transitional.

  2. A Gaussian-Process *regressor* estimating the adiabatic flame temperature
        [oxygen_fraction, sooting_index] -> Tad_K
     so a live cabin setting (O2 % + fuel) can be placed in the same
     (oxygen, temperature) space the real data lives in.

The CFI-G data only covers gaseous hydrocarbon fuels, so predictions for sooty
solids (PMMA, cotton) are flagged `extrapolated` and their confidence damped —
consistent with the rest of the app's trust-aware ethos.
"""
from __future__ import annotations
import json
import os
import numpy as np
from sklearn.gaussian_process import GaussianProcessClassifier, GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, Matern, WhiteKernel, ConstantKernel
from sklearn.preprocessing import StandardScaler

import physics

DATA = os.path.join(os.path.dirname(__file__), "data", "flame_color_master.json")
CLASSES = ["blue", "mixed", "yellow"]

# App fuels mapped onto the same 0-1 sooting scale as the CFI-G gases, reusing
# the physics soot_base so the classifier sees a consistent fuel feature.
APP_FUEL_SOOTING = {name: f["soot_base"] for name, f in physics.FUELS.items()}

# The gaseous training domain. Outside it (e.g. sooty solids) we extrapolate.
TRAIN_SOOT_MAX = 0.35

# Display colors for the flame tint (sRGB).
_BLUE = (74, 144, 255)
_YELLOW = (255, 177, 60)


def _hex(rgb) -> str:
    return "#%02x%02x%02x" % tuple(int(round(c)) for c in rgb)


def _blend(soot_eq: float) -> str:
    t = max(0.0, min(1.0, soot_eq))
    return _hex(b + (y - b) * t for b, y in zip(_BLUE, _YELLOW))


class FlameColorModel:
    def __init__(self):
        with open(DATA, encoding="utf-8") as fh:
            blob = json.load(fh)
        self.citation = blob["citation"]
        self.counts = blob["counts"]
        records = blob["records"]

        # --- classifier: only the three real color classes with a temperature ---
        cls = [r for r in records if r["color"] in CLASSES and r["flame_temp_k"] is not None]
        Xc = np.array([[r["oxygen_fraction"], r["flame_temp_k"], r["sooting_index"]] for r in cls], float)
        yc = np.array([CLASSES.index(r["color"]) for r in cls])
        self.cls_scaler = StandardScaler().fit(Xc)
        kernel = ConstantKernel(1.0) * RBF(length_scale=[1.0, 1.0, 1.0], length_scale_bounds=(1e-1, 1e6))
        self.classifier = GaussianProcessClassifier(kernel=kernel, max_iter_predict=200)
        self.classifier.fit(self.cls_scaler.transform(Xc), yc)
        self._fit_classes = sorted(set(yc.tolist()))
        self.n_train = len(cls)

        # --- regressor: adiabatic flame temperature from oxygen + fuel sooting ---
        temp = [r for r in records if r["flame_temp_k"] is not None]
        Xt = np.array([[r["oxygen_fraction"], r["sooting_index"]] for r in temp], float)
        yt = np.array([r["flame_temp_k"] for r in temp], float)
        self.tad_scaler = StandardScaler().fit(Xt)
        tkernel = (
            ConstantKernel(1.0) * Matern(length_scale=[1.0, 1.0], length_scale_bounds=(1e-1, 1e3), nu=2.5)
            + WhiteKernel(noise_level=1e-2, noise_level_bounds=(1e-6, 1e1))  # normalize_y=True: noise is on unit-variance scale
        )
        self.tad = GaussianProcessRegressor(kernel=tkernel, normalize_y=True, n_restarts_optimizer=1, alpha=1e-6)
        self.tad.fit(self.tad_scaler.transform(Xt), yt)

    def estimate_temp_k(self, oxygen_fraction: float, sooting_index: float) -> float:
        xs = self.tad_scaler.transform([[oxygen_fraction, sooting_index]])
        return float(self.tad.predict(xs)[0])

    def predict(self, o2_percent: float, fuel_material: str, flame_temp_k: float | None = None) -> dict:
        oxygen_fraction = max(0.0, min(1.0, o2_percent / 100.0))
        sooting_index = APP_FUEL_SOOTING.get(fuel_material, 0.2)
        tad = flame_temp_k if flame_temp_k is not None else self.estimate_temp_k(oxygen_fraction, sooting_index)

        xs = self.cls_scaler.transform([[oxygen_fraction, tad, sooting_index]])
        proba = self.classifier.predict_proba(xs)[0]
        # map model's fitted-class order back onto the full CLASSES vector
        probs = {CLASSES[c]: 0.0 for c in range(len(CLASSES))}
        for col, cls_idx in enumerate(self._fit_classes):
            probs[CLASSES[cls_idx]] = float(proba[col])

        p_blue, p_mixed, p_yellow = probs["blue"], probs["mixed"], probs["yellow"]
        label = max(probs, key=probs.get)
        # probability-weighted soot so the rendered flame shifts smoothly blue->yellow
        soot_equivalent = round(0.08 * p_blue + 0.5 * p_mixed + 0.9 * p_yellow, 3)

        extrapolated = sooting_index > TRAIN_SOOT_MAX or not (0.12 <= oxygen_fraction <= 0.85)
        confidence = max(probs.values())
        if extrapolated:
            confidence *= 0.6  # damp confidence for out-of-domain (solid) fuels

        return {
            "label": label,
            "hex": _blend(soot_equivalent),
            "soot_equivalent": soot_equivalent,
            "confidence": round(float(confidence), 3),
            "p_blue": round(p_blue, 3),
            "p_yellow": round(p_yellow, 3),
            "p_mixed": round(p_mixed, 3),
            "est_flame_temp_k": round(tad, 1),
            "oxygen_fraction": round(oxygen_fraction, 4),
            "extrapolated": bool(extrapolated),
            "basis": f"NASA ACME CFI-G — {self.n_train} observed-color runs",
        }
