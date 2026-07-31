from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

AGENT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AGENT_DIR))

from flyrank_agent import AgentFailure, FlyRankOpportunityScout, LocalTools

SAMPLE_DIR = AGENT_DIR / "sample_data"


class FlyRankOpportunityScoutTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.input_dir = self.root / "input"
        self.output_dir = self.root / "output"
        shutil.copytree(SAMPLE_DIR, self.input_dir)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def agent(self) -> FlyRankOpportunityScout:
        return FlyRankOpportunityScout(LocalTools(self.input_dir, self.output_dir))

    def test_successful_end_to_end_run_writes_two_reports(self) -> None:
        result = self.agent().run()
        self.assertEqual(len(result["opportunities"]), 4)
        self.assertTrue((self.output_dir / "opportunity_report.json").exists())
        self.assertTrue((self.output_dir / "opportunity_brief.md").exists())
        stored = json.loads((self.output_dir / "opportunity_report.json").read_text(encoding="utf-8"))
        self.assertEqual(stored["agent"], "FlyRank Opportunity Scout")
        self.assertTrue(stored["tool_log"])

    def test_missing_required_dataset_stops_before_output(self) -> None:
        (self.input_dir / "ga4_events.csv").unlink()
        with self.assertRaisesRegex(AgentFailure, "Expected exactly one ga4_events file"):
            self.agent().run()
        self.assertFalse(self.output_dir.exists())

    def test_blank_query_is_retained_as_anonymized_demand(self) -> None:
        agent = self.agent()
        gsc = agent._aggregate_gsc([{
            "landing_page": "/anonymous-demand",
            "query": "",
            "impressions": "500",
            "clicks": "5",
            "position": "9",
        }])
        result = agent._score(gsc, {})[0]
        self.assertEqual(result.primary_query, "(anonymized)")
        self.assertEqual(result.intent, "anonymized")
        self.assertEqual(result.impressions, 500)

    def test_malformed_ga4_json_is_quarantined(self) -> None:
        flattened, invalid = self.agent()._flatten_ga4([{
            "device": "{broken",
            "geo": "{}",
            "traffic_source": "{}",
            "ecommerce": "{}",
        }])
        self.assertEqual(invalid, 1)
        self.assertTrue(flattened[0]["device_json"]["_quarantined"])

    def test_unmatched_pages_are_preserved_without_false_join(self) -> None:
        agent = self.agent()
        gsc = agent._aggregate_gsc([{
            "landing_page": "/gsc-only",
            "query": "comparison query",
            "impressions": "800",
            "clicks": "8",
            "position": "8",
        }])
        ga4 = {"/ga4-only": {
            "sessions": 50,
            "engaged_sessions": 25,
            "conversions": 0,
            "revenue": 0.0,
        }}
        results = {item.landing_page: item for item in agent._score(gsc, ga4)}
        self.assertEqual(set(results), {"/gsc-only", "/ga4-only"})
        self.assertTrue(any("GSC-only page" in line for line in results["/gsc-only"].evidence))
        self.assertTrue(any("GA4-only page" in line for line in results["/ga4-only"].evidence))


if __name__ == "__main__":
    unittest.main()
