"""Build small processed replay files for the Saffire-I experiment.

Reads the ORIGINAL NASA downloads (read-only, never modified):
  frontend/public/data/Saffire-I/
    - Saffire-I Sample 1 Sensor Data Complete TM graphs.xlsx  (Calibrated Data sheet)
    - SAFFIRE_I_S1C1_jpeg_part1.zip                            (burn-camera frames)

Writes compact app assets to:
  frontend/public/replay/saffire-1/
    - conditions.json   experiment conditions + provenance + channel catalog
    - sensors.json      ~1 Hz downsampled verified sensor series (nulls kept as gaps)
    - frames.json       manifest [{t, epoch, src}] for the image subset
    - frames/*.jpg      ~80 downscaled S1C1 frames

Timing: image filename epoch (ms) -> elapsed = (epoch - T0)/1000, where T0 is the
Calibrated Data epoch at Elapsed Time 0. This mapping is VERIFIED against the workbook's
"Camera Data" sheet (its Time(s) equals (Epoch-T0)/1000 exactly). So images and sensors
share one real clock.
"""
from __future__ import annotations
import io
import json
import math
import os
import zipfile
import openpyxl
from PIL import Image

HERE = os.path.dirname(__file__)
# raw NASA downloads live OUTSIDE the frontend so Vite never bundles them (data_raw/ is git-ignored)
SRC = os.path.join(HERE, "..", "data_raw", "Saffire-I")
OUT = os.path.join(HERE, "..", "frontend", "public", "replay", "saffire-1")
XLSX = os.path.join(SRC, "Saffire-I Sample 1 Sensor Data Complete TM graphs.xlsx")
ZIP = os.path.join(SRC, "SAFFIRE_I_S1C1_jpeg_part1.zip")

FRAME_COUNT = 80
FRAME_WIDTH = 480
SENSOR_HZ_DIVISOR = 30  # 30 Hz source -> ~1 Hz

# channel header in xlsx -> (short key, unit, group)
CHANNELS = {
    "O2": ("o2", "%", "atmosphere"),
    "CO2": ("co2", "%", "atmosphere"),
    "Ambient Pressure": ("pressure", "PSIA", "atmosphere"),
    "Anemometer 1": ("flow", "cm/s", "flow"),
    "Radiometer 1": ("rad1", "mW/cm²", "radiometer"),
    "Radiometer 2": ("rad2", "mW/cm²", "radiometer"),
    "Radiometer 3": ("rad3", "mW/cm²", "radiometer"),
    "Radiometer 4": ("rad4", "mW/cm²", "radiometer"),
    "Sample Temp 1 (TC7)": ("tc7", "°C", "sample_temp"),
    "Sample Temp 2 (TC8)": ("tc8", "°C", "sample_temp"),
    "Sample Temp 3 (TC9)": ("tc9", "°C", "sample_temp"),
    "Sample Temp 4 (TC10)": ("tc10", "°C", "sample_temp"),
    "Sample Temp 5 (TC11)": ("tc11", "°C", "sample_temp"),
    "Sample Temp 6 (TC12)": ("tc12", "°C", "sample_temp"),
    "Igniter Current": ("igniter_a", "A", "igniter"),
}


def num(v):
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return None if (isinstance(v, float) and math.isnan(v)) else round(float(v), 4)
    try:
        return round(float(v), 4)
    except (TypeError, ValueError):
        return None


def process_sensors():
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb["Calibrated Data"]
    hdr = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
    col = {h: i for i, h in enumerate(hdr)}
    t_col = col["Elapsed Time (s)"]
    e_col = col["Epoch Time"]

    samples = []
    t0_epoch = None
    ign_on = ign_off = None
    row_i = 0
    for r in ws.iter_rows(min_row=3, values_only=True):
        if t0_epoch is None:
            t0_epoch = r[e_col]
        ic = r[col["Igniter Current"]]
        et = r[t_col]
        if isinstance(ic, (int, float)) and ic > 0.5:
            if ign_on is None:
                ign_on = round(et, 2)
            ign_off = round(et, 2)
        if row_i % SENSOR_HZ_DIVISOR == 0:
            s = {"t": round(et, 2)}
            for head, (key, _u, _g) in CHANNELS.items():
                s[key] = num(r[col[head]])
            samples.append(s)
        row_i += 1
    wb.close()

    channels = [{"key": k, "label": h, "unit": u, "group": g}
                for h, (k, u, g) in CHANNELS.items()]
    sensors = {
        "t0_epoch_ms": t0_epoch,
        "sample_hz": round(30 / SENSOR_HZ_DIVISOR, 3),
        "duration_s": samples[-1]["t"],
        "channels": channels,
        "markers": [
            {"t": ign_on, "label": "Igniter ON"},
            {"t": ign_off, "label": "Igniter OFF"},
        ],
        "samples": samples,
    }
    json.dump(sensors, open(os.path.join(OUT, "sensors.json"), "w"), separators=(",", ":"))
    print(f"  sensors.json: {len(samples)} samples, {len(channels)} channels, igniter {ign_on}-{ign_off}s")
    return t0_epoch, ign_on, ign_off, samples


def process_frames(t0_epoch):
    os.makedirs(os.path.join(OUT, "frames"), exist_ok=True)
    zf = zipfile.ZipFile(ZIP)
    names = sorted(n for n in zf.namelist() if n.lower().endswith((".jpeg", ".jpg")))
    step = max(1, len(names) // FRAME_COUNT)
    picked = names[::step][:FRAME_COUNT]

    manifest = []
    for n in picked:
        epoch = int(os.path.splitext(os.path.basename(n))[0].split("-")[-1])
        t = round((epoch - t0_epoch) / 1000.0, 3)
        img = Image.open(io.BytesIO(zf.read(n))).convert("RGB")
        w, h = img.size
        img = img.resize((FRAME_WIDTH, round(h * FRAME_WIDTH / w)), Image.LANCZOS)
        out_name = f"f_{epoch}.jpg"
        img.save(os.path.join(OUT, "frames", out_name), "JPEG", quality=72, optimize=True)
        manifest.append({"t": t, "epoch": epoch, "src": f"frames/{out_name}"})
    zf.close()

    json.dump({"camera": "S1C1", "frame_count": len(manifest),
               "t_start": manifest[0]["t"], "t_end": manifest[-1]["t"],
               "frames": manifest},
              open(os.path.join(OUT, "frames.json"), "w"), separators=(",", ":"))
    total_kb = sum(os.path.getsize(os.path.join(OUT, "frames", f"f_{m['epoch']}.jpg")) for m in manifest) / 1024
    print(f"  frames: {len(manifest)} jpgs, t={manifest[0]['t']}..{manifest[-1]['t']}s, {total_kb:.0f} KB total")
    return manifest


def write_conditions(t0_epoch, ign_on, ign_off, samples, frames):
    # real measured atmosphere at ignition (verified from sensors, not planning values)
    at_ign = min(samples, key=lambda s: abs(s["t"] - (ign_off or 68)))
    conditions = {
        "investigation": "SAFFIRE-I (Spacecraft Fire Safety Experiment-I)",
        "psi_id": "PSI-98 / PSI-166",
        "doi": "10.60555/0t15-1z43",
        "platform": "Orbital Sciences Cygnus (post-ISS, uncrewed)",
        "date_utc": "2016-06-14",
        "pi": "David L. Urban, NASA Glenn Research Center",
        "sample": {
            "material": "SIBAL fabric (75% cotton / 25% fiberglass)",
            "size_mm": "300 × 800 (width × length)",
            "run": "Sample 1 (S1), concurrent flow",
        },
        "measured_at_ignition": {
            "o2_percent": at_ign.get("o2"),
            "co2_percent": at_ign.get("co2"),
            "pressure_psia": at_ign.get("pressure"),
            "flow_cm_s_nominal": 20.0,
        },
        "events": {"igniter_on_s": ign_on, "igniter_off_s": ign_off},
        "timing": {
            "t0_epoch_ms": t0_epoch,
            "image_sync": "verified",
            "image_sync_note": "Frame epoch(ms) in filename maps to sensor clock via elapsed=(epoch-t0)/1000, confirmed against the workbook 'Camera Data' sheet.",
        },
        "camera": {"id": "S1C1", "frames_available": len(frames),
                   "window_s": [frames[0]["t"], frames[-1]["t"]],
                   "note": "S1C1_jpeg_part1 covers the early-to-mid burn; later frames are in parts not downloaded."},
        "sources": [
            "Saffire-I Sample 1 Sensor Data Complete TM graphs.xlsx → 'Calibrated Data' sheet",
            "SAFFIRE_I_S1C1_jpeg_part1.zip (S1C1 burn camera)",
            "SAFFIRE-I Image Directory Nomenclature.pdf",
            "SFSDP-VIS-0295 Thermocouple Placement.pdf",
            "PSI-98 metadata (ISA-Tab i_Investigation.txt)",
        ],
        "provenance": "real_psi",
    }
    json.dump(conditions, open(os.path.join(OUT, "conditions.json"), "w"), indent=2)
    print(f"  conditions.json: O2={at_ign.get('o2')}%  CO2={at_ign.get('co2')}%  P={at_ign.get('pressure')} PSIA")


def main():
    os.makedirs(OUT, exist_ok=True)
    print("Processing Saffire-I replay assets...")
    t0, ign_on, ign_off, samples = process_sensors()
    frames = process_frames(t0)
    write_conditions(t0, ign_on, ign_off, samples, frames)
    print("Done ->", os.path.relpath(OUT, HERE))


if __name__ == "__main__":
    main()
