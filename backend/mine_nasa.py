"""Collect NASA flame evidence outside the model dataset. Run with --help."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path
from zipfile import BadZipFile, ZipFile

from psi_table_mappings import TABLE_MAPPINGS


BACKEND = Path(__file__).resolve().parent
WORKSPACE = BACKEND.parent / "data_raw" / "mining"
PSI_BASE = "https://psi.nasa.gov/physci/repo/data/investigations/PSI-"
NTRS_BASE = "https://ntrs.nasa.gov"
PSI = {
    "bass-ii": 25, "saffire-1": 98, "acme-cfi-g": 159, "flex": 69, "same": 102,
    "saffire-2": 99, "acme-flame-design": 10, "bass": 26, "bass-tomography": 62,
    "saffire-3": 100, "spice": 107, "spice-analysis": 60, "flex-2": 68,
    "cool-flame-transitions": 142, "cool-flame-convective": 117, "same-r": 101,
}
REPORTS = {
    "luci": (20250010653, "ASGSR%202025-LUCI-Ferkul-Presentation-v2-20250010653.pdf"),
    "bass-ii": (20210011385, "TM-20210011385.pdf"),
    "sofie-gel": (20240007628, "GELsymposiumfinalRev1.pdf"),
}
PDF_LIMIT = 64 * 1024 * 1024
PSI_LIMIT = 10 * 1024 * 1024
PSI_STATUS_OVERRIDES = {
    25: {
        "status": "unavailable_in_session",
        "detail": "The connected browser returned NASA's 'investigation not available' message; the indexed PSI-25 record still exists, so retry from the current BPS/PSI entry point before treating it as unpublished.",
        "fallback_sources": [
            f"{NTRS_BASE}/citations/20210011385",
            "frontend/public/replay/bass-2/compare.json",
        ],
    },
}
PSI_METADATA_ONLY = {
    60: "Analysis/modeling investigation; NASA lists no associated Experimental Table and links back to PSI-107 data.",
    62: "Modeling investigation; NASA lists no associated Experimental Table and links back to BASS/PSI-25 and PSI-26 data.",
    117: "Analysis/modeling investigation; NASA lists no associated Experimental Table and provides metadata plus analyzed data/reports.",
}


def artifact(path: Path) -> dict:
    with path.open("rb") as f:
        return {"path": str(path), "sha256": hashlib.file_digest(f, "sha256").hexdigest(),
                "bytes": path.stat().st_size}


def download_pdf(url: str, path: Path):
    # Stage on the destination filesystem; a failed download cannot leave a cached PDF.
    with tempfile.TemporaryDirectory(dir=path.parent) as tmp:
        staged = Path(tmp) / path.name
        result = subprocess.run(
            ["curl", "--disable", "--fail", "--silent", "--show-error", "--location",
             "--proto", "=https", "--connect-timeout", "15", "--max-time", "180",
             "--max-filesize", str(PDF_LIMIT),
             "--output", str(staged), url],
            capture_output=True, text=True, check=False,
        )
        if result.returncode:
            raise ValueError(result.stderr.strip() or f"curl exited with {result.returncode}")
        with staged.open("rb") as f:
            if f.read(5) != b"%PDF-" or staged.stat().st_size > PDF_LIMIT:
                raise ValueError("NASA did not return a PDF within the size limit")
            f.seek(max(0, staged.stat().st_size - 1024))
            if b"%%EOF" not in f.read():
                raise ValueError("PDF download is incomplete")
        path.hardlink_to(staged)


def report_status(name: str, directory: Path, fetch: bool) -> dict:
    doc_id, filename = REPORTS[name]
    url = f"{NTRS_BASE}/api/citations/{doc_id}/downloads/{filename}"
    entry = {"study": name, "citation": f"{NTRS_BASE}/citations/{doc_id}", "download_url": url}
    path = directory / f"{name}-{doc_id}.pdf"
    try:
        if not path.exists() and fetch:
            print(f"Downloading {name} from NASA NTRS...", flush=True)
            download_pdf(url, path)
        if not path.exists():
            return {**entry, "status": "not_cached"}
        return {**entry, "status": "cached", **artifact(path)}
    except (OSError, ValueError) as exc:
        return {**entry, "status": "error", "detail": str(exc)}


def psi_inputs(folder: str, number: int, inbox: Path) -> tuple[list[Path], list[Path]]:
    tables, metadata = [], []
    for directory in (BACKEND / "data" / "raw" / folder, inbox / folder, inbox):
        if not directory.is_dir():
            continue
        for path in directory.iterdir():
            name = path.name.casefold()
            if not path.is_file():
                continue
            match = re.search(r"\bpsi[-_ ](\d+)(?!\d)", name)
            if (match and int(match[1]) != number) or (directory == inbox and not match):
                continue
            words = re.sub(r"[_\s-]+", " ", name)
            if name.endswith(".csv") and re.search(r"\bexperiment(?:al)? table\b", words):
                tables.append(path.resolve())
            elif name == "i_investigation.txt" or (name.endswith(".zip") and "metadata" in words):
                metadata.append(path.resolve())
    # A downloaded PSI bundle commonly contains the original metadata ZIP and an extracted
    # i_Investigation.txt. Prefer the explicit ISA-Tab file when both are present.
    plain_metadata = [p for p in metadata if p.name.casefold() == "i_investigation.txt"]
    if plain_metadata:
        metadata = plain_metadata
    return sorted(set(tables)), sorted(set(metadata))


def metadata_id(path: Path) -> str:
    if path.suffix.casefold() == ".zip":
        with ZipFile(path) as archive:
            members = [m for m in archive.infolist()
                       if m.filename.rsplit("/", 1)[-1].casefold() == "i_investigation.txt"
                       and not m.filename.startswith("__MACOSX/")]
            if len(members) != 1 or members[0].file_size > PSI_LIMIT:
                raise ValueError("expected one small i_Investigation.txt in the ZIP")
            # Read the metadata directly; never unpack archive paths onto disk.
            contents = archive.read(members[0])
    else:
        contents = path.read_bytes()
    identifiers = set()
    for line in contents.decode("utf-8-sig").splitlines():
        key, _, values = line.partition("\t")
        if key.strip() in {"Study Identifier", "Investigation Identifier"}:
            identifiers.update(re.findall(r"\bPSI-\d+\b", values.upper()))
    if len(identifiers) != 1:
        raise ValueError("could not verify one PSI study ID in ISA-Tab metadata")
    return identifiers.pop()


def read_table(path: Path, encoding: str) -> tuple[list[str], list[tuple[int, dict[str, str]]]]:
    if path.stat().st_size > PSI_LIMIT:
        raise ValueError(f"{path.name} exceeds 10 MiB")
    with path.open(encoding=encoding, newline="") as f:
        reader = csv.reader(f, strict=True)
        header = [cell.strip() for cell in next(reader, [])]
        if len(header) < 2 or len(set(header)) != len(header) or not all(header):
            raise ValueError(f"invalid or duplicate CSV column names in {path.name}")
        rows = []
        for cells in reader:
            if not any(cell.strip() for cell in cells):
                continue
            if len(cells) != len(header):
                raise ValueError(f"{path.name} line {reader.line_num} does not match the header width")
            rows.append((reader.line_num, dict(zip(header, cells))))
    if not rows:
        raise ValueError(f"{path.name} has no data rows")
    return header, rows


def supplemental_files(folder: str, inbox: Path) -> list[dict]:
    """Hash non-table analysis outputs that accompany a metadata-only PSI study."""
    if folder != "cool-flame-convective":
        return []
    directory = inbox / folder
    if not directory.is_dir():
        return []
    return [artifact(path) for path in sorted(directory.iterdir())
            if path.is_file() and path.name.startswith("PSI-117_Analyzed Data_")]


def psi_status(folder: str, number: int, inbox: Path) -> dict:
    tables, metadata = psi_inputs(folder, number, inbox)
    entry = {"study": folder, "psi_id": f"PSI-{number}", "source_url": f"{PSI_BASE}{number}",
             "tables": [str(p) for p in tables], "metadata": [str(p) for p in metadata]}
    if supplemental := supplemental_files(folder, inbox):
        entry["supplemental"] = supplemental
    if number in PSI_STATUS_OVERRIDES and not tables and not metadata:
        return {**entry, **PSI_STATUS_OVERRIDES[number]}
    if len(metadata) > 1 or (len(tables) > 1 and folder not in TABLE_MAPPINGS):
        return {**entry, "status": "ambiguous", "detail": "Multiple copies of the experiment table or ISA-Tab metadata."}
    if not tables or not metadata:
        entry["missing"] = [name for name, paths in (("experiment table", tables), ("ISA-Tab metadata", metadata)) if not paths]
    try:
        if metadata:
            meta = metadata[0]
            if meta.stat().st_size > PSI_LIMIT:
                raise ValueError("metadata exceeds 10 MiB")
            if metadata_id(meta) != entry["psi_id"]:
                raise ValueError("ISA-Tab study ID does not match the expected investigation")
            entry["isatab"] = artifact(meta)
        if not tables:
            if number in PSI_METADATA_ONLY:
                if metadata:
                    return {**entry, "use": "context_only", "status": "metadata_only",
                            "detail": PSI_METADATA_ONLY[number]}
                return {**entry, "status": "needs_download",
                        "detail": PSI_METADATA_ONLY[number] + " Download the metadata ZIP only."}
            return {**entry, "status": "needs_download"}
        mappings = TABLE_MAPPINGS.get(folder, {})
        table_results = []
        variants = set()
        for table in tables:
            encoding = "utf-8-sig"
            try:
                header, rows = read_table(table, encoding)
            except UnicodeDecodeError:
                if folder != "flex":
                    raise
                encoding = "cp1252"
                header, rows = read_table(table, encoding)
            result = {"file": table.name, "artifact": artifact(table), "encoding": encoding,
                      "columns": header, "rows": len(rows)}
            for variant, (pairs, notes) in mappings.items():
                columns = dict(pairs)
                if columns.keys() != set(header):
                    continue
                if variant in variants:
                    return {**entry, "status": "ambiguous", "detail": f"Multiple CFI-G {variant} exports."}
                variants.add(variant)
                result.update(
                    variant=variant, column_mapping=columns, notes=notes,
                    reported_rows=[{"csv_line": line, **{key: row[col].strip() or None for col, key in pairs}}
                                   for line, row in rows],
                )
                break
            table_results.append(result)
        entry.update(table_details=table_results, rows=sum(t["rows"] for t in table_results))
        if len(table_results) == 1:
            entry.update(table=table_results[0]["artifact"], columns=table_results[0]["columns"])
        if len(tables) > 1 and len(variants) != len(tables):
            return {**entry, "status": "ambiguous", "detail": "Expected distinct CFI-G normal and inverse exports."}
        if variants:
            if missing_variants := sorted(mappings.keys() - variants):
                entry.setdefault("missing", []).extend(f"{variant} experiment table" for variant in missing_variants)
            return {**entry, "use": "evidence_only", "status": "mapped_incomplete" if entry.get("missing") else "catalogued"}
        if not metadata:
            return {**entry, "status": "needs_download"}
        if folder != "saffire-1":
            return {**entry, "status": "needs_mapping"}
        keys = ("Sample Number", "Material", "Percent O2", "Air Flow (cm/s)", "Flow Direction", "Burn Time (s)")
        if not set(keys).issubset(header):
            return {**entry, "status": "needs_mapping"}
        conditions = [{"csv_line": line, **{key: row[key].strip() or None for key in keys}}
                      for line, row in rows if re.fullmatch(r"S\d+", row.get("Sample Number", "").strip())]
        if not conditions:
            raise ValueError("no Saffire-I burn rows found")
        return {**entry, "status": "catalogued", "reported_conditions": conditions,
                "detail": "Test matrix values as published; no measured flame outcomes in this mapping."}
    except (OSError, ValueError, RuntimeError, csv.Error, BadZipFile) as exc:
        return {**entry, "status": "error", "detail": str(exc)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch", action="store_true", help="download missing public NASA reports")
    parser.add_argument("--inbox", type=Path,
                        help="folder with named PSI exports or per-study subfolders")
    args = parser.parse_args()
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    inbox = args.inbox or WORKSPACE / "inbox"
    if args.inbox is None:
        inbox.mkdir(exist_ok=True)
    elif not inbox.is_dir():
        parser.error(f"inbox directory does not exist: {inbox}")
    reports = [report_status(name, WORKSPACE, args.fetch) for name in REPORTS]
    studies = [psi_status(name, number, inbox.resolve()) for name, number in PSI.items()]
    evidence = json.loads((BACKEND / "data" / "mined_evidence.json").read_text(encoding="utf-8"))
    output = WORKSPACE / "manifest.json"
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=WORKSPACE, delete=False) as f:
        staged = Path(f.name)
        try:
            json.dump({"reports": reports, "psi": studies, "reviewed_evidence": evidence}, f,
                      indent=2, ensure_ascii=False, allow_nan=False)
            f.write("\n")
            f.close()
            staged.replace(output)
        finally:
            staged.unlink(missing_ok=True)
    for entry in [*reports, *studies]:
        source = entry.get("psi_id", "NTRS")
        detail = entry.get("detail") or ", ".join(entry.get("missing", []))
        print(f"{entry['study']} [{source}]: {entry['status']}" + (f" ({detail})" if detail else ""))
    print(f"{len(evidence)} reviewed evidence run(s). Manifest: {output}")
    return int(any(entry["status"] in {"error", "ambiguous"} for entry in [*reports, *studies]))


if __name__ == "__main__":
    raise SystemExit(main())
