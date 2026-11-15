import io
import json
import os
import unittest
import urllib.error
from unittest.mock import patch

import briefing
from briefing_packet import select_top, build_packet, summary_fields
from evidence import rank_evidence
from export_evidence import load_catalog

MOON = {"gravity_g": 0.17, "o2_percent": 34, "pressure_psi": 8.2, "airflow_cm_s": 10,
        "diluent": "N2", "fuel_material": "PMMA_Acrylic"}
CATALOG = load_catalog()


def post():
    request = briefing.BriefingRequest(scenario_key="moon", cabin=MOON)
    return briefing.BriefingResponse(**briefing.briefing(request)).model_dump()


def packet_ids():
    return [p["id"] for p in build_packet(CATALOG, rank_evidence(CATALOG, {"cabin": MOON, "context": {}}))]


def good(ids):
    return json.dumps({k: {"text": f"{k} sentence.", "record_id": ids[0]} for k in briefing.FIELDS})


@unittest.skipUnless(os.environ.get("GEMINI_API_KEY"), "set GEMINI_API_KEY to run the live provider test")
class LiveProviderTest(unittest.TestCase):
    def test_real_call_returns_valid_fields(self):
        ids = packet_ids()
        packet = build_packet(CATALOG, rank_evidence(CATALOG, {"cabin": MOON, "context": {}}))
        trace_id = briefing.new_trace_id()
        print(f"\nlive briefing trace={trace_id} model={os.environ.get('BRIEFING_MODEL', briefing.DEFAULT_MODEL)}")
        raw = briefing.call_provider(packet, os.environ["GEMINI_API_KEY"], trace_id)
        self.assertIsNotNone(briefing.parse_fields(raw, set(ids)), raw[:300])


class BriefingTests(unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
        env.start()
        self.addCleanup(env.stop)

    def run_with(self, result):
        side = result if isinstance(result, Exception) else None
        with patch.object(briefing, "call_provider", side_effect=side, return_value=None if side else result):
            return post()

    def test_valid_response_is_ai_with_server_citation(self):
        ids = packet_ids()
        out = self.run_with(good(ids))
        self.assertEqual(out["mode"], "ai")
        self.assertEqual(out["fields"]["limit"]["record_id"], ids[0])
        self.assertTrue(out["fields"]["limit"]["citation"]["url"].startswith("https://"))

    def test_wrong_record_id_falls_back(self):
        bad = json.dumps({k: {"text": "x", "record_id": "not-in-packet"} for k in briefing.FIELDS})
        self.assertEqual(self.run_with(bad)["mode"], "summary")

    def test_malformed_json_falls_back(self):
        self.assertEqual(self.run_with("not json")["mode"], "summary")

    def test_timeout_falls_back(self):
        self.assertEqual(self.run_with(TimeoutError())["mode"], "summary")

    def test_missing_key_skips_provider(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(briefing, "call_provider") as call:
            out = post()
        call.assert_not_called()
        self.assertEqual(out["mode"], "summary")
        self.assertTrue(out["fields"]["observation"]["record_id"])

    def test_selects_same_ids_as_select_top(self):
        ranked = rank_evidence(CATALOG, {"cabin": MOON, "context": {}})
        self.assertEqual(packet_ids(), [e["id"] for e in select_top(ranked)])
        self.assertEqual(len(packet_ids()), 3)

    def test_evidence_gap_skips_provider(self):
        gap = {**CATALOG, "records": [{**r, "observations": []} for r in CATALOG["records"]]}
        with patch.object(briefing, "call_provider") as call:
            out = briefing.make_briefing(briefing.BriefingRequest(scenario_key="g", cabin=MOON), gap)
        call.assert_not_called()
        self.assertEqual(out["mode"], "summary")
        self.assertIn("No reviewed NASA record", out["fields"]["observation"]["text"])

    def test_citation_matches_card_source(self):
        # The frontend card links the first observation's source; the briefing must cite the same one.
        for record in CATALOG["records"]:
            if record["observations"]:
                cite = briefing.resolve_citation(CATALOG, record["id"])
                self.assertEqual(cite["source_id"], record["observations"][0]["source"]["source_id"])
                self.assertEqual(cite["locator"], record["observations"][0]["source"]["locator"])

    def test_summary_differences_use_normalized_units_and_skip_matches(self):
        # FLEX stores pressure in mmHg and O2 as a mole fraction; the summary must show converted values.
        droplet = {**MOON, "gravity_g": 0, "o2_percent": 21, "fuel_material": "Heptane_Droplet"}
        packet = build_packet(CATALOG, rank_evidence(CATALOG, {"cabin": droplet, "context": {}}))
        text = summary_fields(packet)["relevance"]["text"]
        self.assertNotIn("759.8", text)
        self.assertIn("14.7 psia", text)
        self.assertIn("16 %", text)
        moon = build_packet(CATALOG, rank_evidence(CATALOG, {"cabin": MOON, "context": {}}))
        self.assertNotIn("airflow_cm_s 10", summary_fields(moon)["relevance"]["text"])

    def test_unknown_record_citation_is_none(self):
        self.assertIsNone(briefing.resolve_citation(CATALOG, "nope"))

    def test_unexpected_error_returns_summary_not_500(self):
        with patch.object(briefing, "make_briefing", side_effect=RuntimeError("boom")):
            out = post()
        self.assertEqual(out["mode"], "summary")

    def test_provider_total_deadline(self):
        class Slow:
            def __enter__(self): return self
            def __exit__(self, *a): return False
            status = 200
            def read(self, n): return b"x"
        with patch.object(briefing.urllib.request, "urlopen", return_value=Slow()), \
                patch.object(briefing, "TIMEOUT_S", -1):
            with self.assertRaises(TimeoutError):
                briefing.call_provider([], "k")

    def test_request_body_follows_interactions_api(self):
        ids = packet_ids()
        packet = build_packet(CATALOG, rank_evidence(CATALOG, {"cabin": MOON, "context": {}}))
        reply = {"id": "i1", "status": "completed", "usage": {}, "steps": [
            {"type": "thought", "signature": "s"},
            {"type": "model_output", "content": [{"type": "text", "text": good(ids)}]}]}
        captured = {}

        class Ok(io.BytesIO):
            status = 200
            def __enter__(self): return self
            def __exit__(self, *a): return False

        def fake_urlopen(request, timeout):
            captured["request"] = request
            return Ok(json.dumps(reply).encode())
        with patch.object(briefing.urllib.request, "urlopen", side_effect=fake_urlopen):
            raw = briefing.call_provider(packet, "secret-key", "t1")
        self.assertIsNotNone(briefing.parse_fields(raw, set(ids)))
        request = captured["request"]
        body = json.loads(request.data)
        self.assertEqual(request.full_url, briefing.API_URL)
        self.assertEqual(request.get_header("X-goog-api-key"), "secret-key")
        self.assertNotIn("secret-key", request.full_url)
        self.assertEqual(body["generation_config"]["thinking_level"], "low")
        self.assertFalse(body["store"])
        self.assertNotIn("temperature", json.dumps(body["generation_config"]))
        enum = body["response_format"]["schema"]["properties"]["limit"]["properties"]["record_id"]["enum"]
        self.assertEqual(sorted(ids), enum)

    def test_incomplete_interaction_raises(self):
        with self.assertRaises(briefing.ProviderError):
            briefing.extract_text({"status": "incomplete", "steps": []})

    def test_http_error_is_traced_without_secrets(self):
        error = urllib.error.HTTPError(briefing.API_URL, 404, "Not Found", {}, io.BytesIO(
            json.dumps({"error": {"status": "NOT_FOUND", "message": "model not found"}}).encode()))
        with patch.object(briefing.urllib.request, "urlopen", side_effect=error), \
                self.assertLogs(briefing.logger, "INFO") as logs, self.assertRaises(briefing.ProviderError):
            briefing.call_provider([], "secret-key", "t2")
        joined = "\n".join(logs.output)
        self.assertIn("trace=t2 event=failed", joined)
        self.assertIn("http=404", joined)
        self.assertIn("NOT_FOUND", joined)
        self.assertNotIn("secret-key", joined)

    def test_trace_header_on_route(self):
        from fastapi import Response
        response = Response()
        with patch.dict(os.environ, {}, clear=True):
            briefing.briefing(briefing.BriefingRequest(scenario_key="moon", cabin=MOON), response)
        self.assertRegex(response.headers.get(briefing.TRACE_HEADER, ""), r"^[0-9a-f]{12}$")

    def test_route_registered_in_app(self):
        import main
        self.assertIn("/api/briefing", [r.path for r in main.app.routes])


if __name__ == "__main__":
    unittest.main()
