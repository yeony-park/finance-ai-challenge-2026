import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/artnguide_due_diligence.json"
RAW_PATH = ROOT / "data/artnguide_track_records.json"
REGISTRY_PATH = ROOT / "data/artnguide_evidence_sources.json"
SPEC = importlib.util.spec_from_file_location(
    "build_artnguide_due_diligence", ROOT / "scripts/build_artnguide_due_diligence.py"
)
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


class ArtnguideDueDiligenceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
        cls.raw = json.loads(RAW_PATH.read_text(encoding="utf-8"))
        cls.registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))

    def test_generated_artifact_is_deterministic(self):
        self.assertEqual(BUILDER.build_payload(), self.payload)

    def test_record_evidence_directly_preserves_raw_artwork_fields(self):
        self.assertEqual(len(self.payload["artist_track_records"]), 187)
        self.assertEqual(len(self.payload["record_evidence"]), 187)
        self.assertEqual(len(self.payload["operator_evidence"]["record_legal_issuer_mapping"]), 187)
        evidence_by_id = {row["id"]: row for row in self.payload["record_evidence"]}
        for raw_record in self.raw["records"]:
            evidence = evidence_by_id[raw_record["id"]]
            self.assertEqual(
                evidence["platform_record_fields"],
                {
                    "title": raw_record["title"],
                    "authorName": raw_record["authorName"],
                    "yearItem": raw_record["yearItem"],
                    "artMaterial": raw_record["artMaterial"],
                    "artSize": raw_record["artSize"],
                },
            )
            self.assertEqual(evidence["external_exact_match"]["status"], "not_found_in_provided_evidence")
            self.assertEqual(evidence["external_exact_match"]["source_ids"], [])

    def test_source_registry_preserves_unverified_individual_lane_urls(self):
        required = {
            "id",
            "url",
            "publisher",
            "source_type",
            "source_or_event_date",
            "accessed_at",
            "evidence_grade",
            "claim_scope",
            "verification_status",
        }
        sources = self.payload["source_registry"]["sources"]
        candidates = [source for source in sources if source.get("candidate_category")]
        self.assertEqual(len(candidates), 68)
        self.assertEqual(len(sources), 76)
        self.assertEqual(self.registry["artist_candidate_sources"], candidates)
        self.assertTrue(all(required <= set(source) for source in sources))
        self.assertTrue(all(source["verification_status"] == "unverified" for source in candidates))
        self.assertTrue(all(source["publisher"] is None for source in candidates))
        self.assertTrue(all(source["url"].startswith("https://") for source in candidates))
        corrected = [
            source
            for source in candidates
            if source["url"] == "https://www.christies.com/en/lot/lot-6236040"
        ]
        self.assertEqual(len(corrected), 1)
        self.assertEqual(corrected[0]["candidate_category"], "same_artist_other_work")
        self.assertEqual(corrected[0]["verification_status"], "unverified")

    def test_name_issuer_and_aggregate_boundaries(self):
        names = self.payload["author_name_evidence"]
        self.assertEqual(names["raw_authorName_distinct_count"], 48)
        self.assertEqual(names["whitespace_normalized_distinct_count"], 45)
        self.assertEqual(names["non_artist_candidates"][0]["raw_or_normalized_name"], "공부차")
        self.assertTrue(
            all(
                row["legal_issuer"] is None and row["verification_status"] == "unverified"
                for row in self.payload["operator_evidence"]["record_legal_issuer_mapping"]
            )
        )
        aggregate = self.payload["aggregate_context"]
        self.assertEqual(aggregate["official_minus_list_record_count"], 1)
        self.assertEqual(aggregate["allocation_of_official_list_difference"], "not_attempted")
        raw_status_counts = {"TRANSFER": 138, "RETURNED_PRODUCT": 12, "EXPECTED_TRANSFER": 37}
        self.assertEqual(
            {
                status: sum(record["status"] == status for record in self.raw["records"])
                for status in raw_status_counts
            },
            raw_status_counts,
        )
        expected = [
            row for row in self.payload["artist_track_records"]
            if row["platform_raw"]["status"] == "EXPECTED_TRANSFER"
        ]
        self.assertEqual(len(expected), 37)
        self.assertTrue(
            all(
                row["platform_raw"]["soldMoney"] == 0
                and not row["derived_for_local_coverage_only"]["soldMoney_aggregate_included"]
                and row["derived_for_local_coverage_only"]["yearProfit_ui_judgment_excluded"]
                and row["derived_for_local_coverage_only"]["yearProfit_aggregate_excluded"]
                for row in expected
            )
        )

    def test_whitespace_normalized_artist_aggregates_cover_the_snapshot(self):
        aggregates = self.payload["artist_aggregates"]
        rows = aggregates["rows"]
        summary = aggregates["summary"]
        self.assertEqual(len(rows), 45)
        self.assertEqual(summary["row_count"], 45)
        self.assertEqual(summary["record_count"], 187)
        self.assertEqual(
            summary["status_counts"],
            {"TRANSFER": 138, "RETURNED_PRODUCT": 12, "EXPECTED_TRANSFER": 37},
        )
        self.assertEqual(summary["completed_record_count"], 150)
        self.assertEqual(summary["all_records_gpMoney_krw"], 49_598_300_000)
        self.assertEqual(summary["completed_soldMoney_krw"], 41_513_812_500)
        self.assertEqual(summary["platform_reported_profit_sample_count"], 150)
        self.assertEqual(summary["platform_reported_dateHold_sample_count"], 150)
        self.assertEqual(summary["as_of"], "2026-08-10T21:22:00+09:00")
        self.assertEqual(summary["source_id"], "artnguide-track-records-snapshot")
        self.assertEqual(sum(row["record_count"] for row in rows), 187)
        self.assertEqual(sum(row["all_records_gpMoney_krw"] for row in rows), 49_598_300_000)
        self.assertEqual(sum(row["completed_soldMoney_krw"] for row in rows), 41_513_812_500)
        self.assertEqual(
            sum(row["platform_reported_profit_percent"]["sample_count"] for row in rows), 150
        )
        self.assertEqual(
            sum(row["platform_reported_dateHold_days"]["sample_count"] for row in rows), 150
        )
        study = next(row for row in rows if row["whitespace_normalized_author_name"] == "공부차")
        self.assertEqual(study["classification"], "non_artist_candidate")
        self.assertEqual(study["exclusions"]["yearProfit"], "excluded_from_artist_aggregate")


if __name__ == "__main__":
    unittest.main()
