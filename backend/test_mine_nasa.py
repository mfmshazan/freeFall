import io
import json
import tempfile
import unittest
from pathlib import Path
from subprocess import CompletedProcess
from unittest.mock import patch
from zipfile import ZipFile

import ingest_psi
import mine_nasa


class MiningTest(unittest.TestCase):
    def setUp(self):
        root = tempfile.TemporaryDirectory()
        self.addCleanup(root.cleanup)
        self.inbox = Path(root.name)

    def drop(self, study_id="PSI-25", table="Run,O2\n1,22.2\n"):
        (self.inbox / "PSI-25_Experimental table.csv").write_text(table)
        with ZipFile(self.inbox / "PSI-25_metadata.zip", "w") as archive:
            archive.writestr("isa/i_Investigation.txt", f"Study Identifier\t{study_id}\n")
        return mine_nasa.psi_status("bass-ii", 25, self.inbox)

    def test_drop_is_catalogued_for_mapping_with_source_hash(self):
        result = self.drop()
        self.assertEqual(result["status"], "needs_mapping")
        self.assertEqual(result["columns"], ["Run", "O2"])
        self.assertEqual(result["rows"], 1)
        self.assertEqual(len(result["table"]["sha256"]), 64)
        self.assertFalse((self.inbox / "isa").exists())

    def test_rejects_mismatched_metadata_and_malformed_table(self):
        result = self.drop(study_id="PSI-98")
        self.assertIn("does not match", result["detail"])
        result = self.drop(table="Run,O2\n1,22.2,extra\n")
        self.assertIn("line 2", result["detail"])
        (self.inbox / "PSI-25_metadata (1).zip").write_bytes((self.inbox / "PSI-25_metadata.zip").read_bytes())
        self.assertEqual(mine_nasa.psi_status("bass-ii", 25, self.inbox)["status"], "ambiguous")

    def test_saffire_preserves_published_text_and_regenerates_legacy_rows(self):
        result = mine_nasa.psi_status("saffire-1", 98, self.inbox)
        self.assertEqual(result["status"], "catalogued")
        self.assertEqual([r["Percent O2"] for r in result["reported_conditions"]], ["21.5 - 21.7", "~ 21.5"])
        master = Path(ingest_psi.OUT).read_bytes()
        backend, front = self.inbox / "backend.json", self.inbox / "front.json"
        backend.write_bytes(master)
        with patch.multiple(ingest_psi, OUT=backend, FRONT_COPY=front), patch("sys.stdout", new=io.StringIO()):
            ingest_psi.main()
        self.assertEqual(json.loads(backend.read_bytes()), json.loads(master))
        self.assertEqual(backend.read_bytes(), front.read_bytes())

    def test_maps_both_cfi_g_tables_without_turning_a_blank_annotation_into_no(self):
        (self.inbox / "PSI-159_Experimental table_Normal.csv").write_text(
            "Flame Type,Day,Fuel,Test,Cool flame?, XO2 before test,XO2  after test,approx p (bar),"
            "Xf,mHC (mg/s),TFP,Tad (K),Zst,Hot ignition,burn time (sec),Self-ext or flow term,"
            "Peak burner T (C ),Comments\n"
            "Normal,10,30% butane,21174 C3,,0.395,0.394,2.0266,0.3,1.5,No,2653,0.20,Yes,35,SE,246,\n"
        )
        inverse = self.inbox / "PSI-159_Experimental table_Inverse.csv"
        inverse.write_text(
            "Flame Type,Day,Fuel,Test,Xf  before test,Xf  after test,approx p (bar),XO2,"
            "HC burnrate (mg/s),O2 flow rate (mg/s),TFP,Tad (K),Zst,Hot ignition,burn time (sec),"
            "Self -ext or flow term,Peak burner Temp (C),Peak burner temp (K),Color,Comments\n"
            "\nInverse,1,ethane,21196 A2,0.298,0.295,1.1,0.21,1.5,5.59,No,2120,0.1665,Yes,35,FT,162.9,436.05,yellow,\n"
        )
        result = mine_nasa.psi_status("acme-cfi-g", 159, self.inbox)
        self.assertEqual(result["status"], "mapped_incomplete")
        self.assertEqual(result["missing"], ["ISA-Tab metadata"])
        mapped = {table["variant"]: table["reported_rows"][0] for table in result["table_details"]}
        normal, inverse_data = mapped["normal"], mapped["inverse"]
        self.assertIsNone(normal["cool_flame_reported"])
        self.assertEqual(normal["peak_burner_temperature_c"], "246")
        self.assertEqual(inverse_data["oxygen_mass_flow_mg_s"], "5.59")
        self.assertEqual(inverse_data["csv_line"], 3)
        (self.inbox / "PSI-159_Experimental table_Inverse (1).csv").write_bytes(inverse.read_bytes())
        self.assertEqual(mine_nasa.psi_status("acme-cfi-g", 159, self.inbox)["status"], "ambiguous")

    def test_flex_reads_windows1252_and_preserves_qualified_values(self):
        table = self.inbox / "PSI-69_Experimental table_FLEX.csv"
        table.write_bytes((
            "FLEX Test #,FLEX Identifier,Test Date,Test GMT,Fuel,Ambient pressure; mmHg,"
            "O initial ambient composition; mole fraction,N initial ambient composition; mole fraction,"
            "CO initial ambient composition; mole fraction,He initial ambient composition; mole fraction,"
            "Droplet initial diameter; mm,Visible flame extinction diameter; mm,Burning rate; mm,Burn time; s,Test end\n"
            "18,248F001,7/1/2009,16:28:56,Heptane,1553.8,0.21,0.09,0.70,0,2.74,–,0.61,~8,Extinction\n"
        ).encode("cp1252"))
        result = mine_nasa.psi_status("flex", 69, self.inbox)
        self.assertEqual(result["status"], "mapped_incomplete")
        self.assertEqual(result["use"], "evidence_only")
        detail = result["table_details"][0]
        self.assertEqual(detail["encoding"], "cp1252")
        row = detail["reported_rows"][0]
        self.assertEqual(row["droplet_d_squared_burning_rate_mm2_s"], "0.61")
        self.assertEqual(row["droplet_diameter_at_visible_extinction_mm"], "–")
        self.assertEqual(row["burn_time_s"], "~8")

    def test_manifest_embeds_catalog_without_promoting_staged_rows(self):
        staged = {"study": "bass-ii", "status": "catalogued", "reported_rows": [{"test": "unreviewed"}]}
        with patch.object(mine_nasa, "WORKSPACE", self.inbox), patch("sys.argv", ["mine_nasa.py"]), \
             patch.object(mine_nasa, "psi_status", return_value=staged), patch("sys.stdout", new=io.StringIO()):
            self.assertEqual(mine_nasa.main(), 0)
        manifest = json.loads((self.inbox / "manifest.json").read_text())
        self.assertEqual(manifest["reviewed_evidence"], mine_nasa.load_catalog())
        self.assertIn(staged, manifest["psi"])
        self.assertNotIn("unreviewed", {record["id"] for record in manifest["reviewed_evidence"]["records"]})

    def test_rejects_incomplete_pdf_without_caching(self):
        def fake_curl(args, **_kwargs):
            Path(args[args.index("--output") + 1]).write_bytes(b"%PDF-1.7\ntruncated")
            return CompletedProcess([], 0)

        with patch.object(mine_nasa.subprocess, "run", fake_curl):
            result = mine_nasa.report_status("luci", self.inbox, True)
        self.assertEqual(result["status"], "error")
        self.assertFalse(list(self.inbox.iterdir()))

    def test_known_unavailable_psi_route_has_fallback_sources(self):
        result = mine_nasa.psi_status("bass-ii", 25, self.inbox)
        self.assertEqual(result["status"], "unavailable_in_session")
        self.assertIn("indexed PSI-25", result["detail"])
        self.assertEqual(len(result["fallback_sources"]), 2)

    def test_analysis_investigation_without_experimental_table_is_metadata_only(self):
        with ZipFile(self.inbox / "PSI-60_metadata.zip", "w") as archive:
            archive.writestr("i_Investigation.txt", "Study Identifier\tPSI-60\n")
        result = mine_nasa.psi_status("spice-analysis", 60, self.inbox)
        self.assertEqual(result["status"], "metadata_only")
        self.assertEqual(result["use"], "context_only")
        self.assertIn("no associated Experimental Table", result["detail"])
