import hashlib
import importlib.util
import json
import unittest
from collections import Counter
from pathlib import Path
from urllib.parse import parse_qsl, urlparse


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/weshareart_research.json"
TRACK_SOURCE_PATH = (
    ROOT / "deliverables/weshareart_co_purchase_track_records_2026-08-10.md"
)
SUITABILITY_SOURCE_PATH = (
    ROOT
    / "deliverables/weshareart_investment_contract_securities_suitability_test_2026-08-10.md"
)
BUILDER_PATH = ROOT / "scripts/build_weshareart_research.py"
SPEC = importlib.util.spec_from_file_location("build_weshareart_research", BUILDER_PATH)
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


def all_urls(value):
    urls = []
    if isinstance(value, dict):
        for nested in value.values():
            urls.extend(all_urls(nested))
    elif isinstance(value, list):
        for nested in value:
            urls.extend(all_urls(nested))
    elif isinstance(value, str) and value.strip().startswith("https://"):
        urls.append(value.strip())
    return urls


class WeShareArtDataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = DATA_PATH.read_text(encoding="utf-8")
        cls.payload = json.loads(cls.raw)
        cls.track = cls.payload["track_records"]
        cls.records = cls.track["records"]
        cls.suitability = cls.payload["suitability_test"]

    def test_generated_snapshot_matches_both_markdown_sources(self):
        rebuilt = BUILDER.build_payload()
        self.assertEqual(rebuilt, self.payload)
        self.assertEqual(BUILDER.serialise(rebuilt), DATA_PATH.read_bytes())

        expected_sources = (
            (
                "deliverables/weshareart_co_purchase_track_records_2026-08-10.md",
                TRACK_SOURCE_PATH,
            ),
            (
                "deliverables/weshareart_investment_contract_securities_suitability_test_2026-08-10.md",
                SUITABILITY_SOURCE_PATH,
            ),
        )
        source_documents = self.payload["dataset"]["source_documents"]
        self.assertEqual(
            [document["path"] for document in source_documents],
            [item[0] for item in expected_sources],
        )
        for document, (_, path) in zip(source_documents, expected_sources):
            self.assertEqual(document["sha256"], hashlib.sha256(path.read_bytes()).hexdigest())

    def test_top_level_contract_counts_and_collection_time(self):
        self.assertEqual(
            tuple(self.payload),
            (
                "schema_version",
                "dataset",
                "sources",
                "track_records",
                "suitability_test",
                "limitations",
                "validation",
            ),
        )
        self.assertEqual(self.payload["schema_version"], "1.0.0")
        dataset = self.payload["dataset"]
        self.assertEqual(dataset["record_count"], 145)
        self.assertEqual(dataset["page_count"], 15)
        self.assertEqual(dataset["suitability_question_count"], 10)
        self.assertEqual(
            dataset["collected_at"],
            {
                "source_text": "2026-08-10 21 : 42~21 : 46 KST",
                "from": "2026-08-10T21:42:00+09:00",
                "to": "2026-08-10T21:46:00+09:00",
            },
        )
        self.assertEqual(dataset["as_of"], "2026-08-10T21:46:00+09:00")
        self.assertEqual(dataset["independent_verification_status"], "not_performed")

    def test_all_145_raw_records_keep_schema_order_and_pagination(self):
        self.assertEqual(len(self.records), 145)
        self.assertEqual([record["sequence"] for record in self.records], list(range(1, 146)))
        self.assertEqual(
            [sum(record["page"] == page for record in self.records) for page in range(1, 16)],
            [10] * 14 + [5],
        )
        for record in self.records:
            expected_position = record["sequence"] - ((record["page"] - 1) * 10)
            self.assertEqual(record["position_in_page"], expected_position)
            self.assertEqual(tuple(record["list"]), BUILDER.LIST_FIELDS)
            self.assertEqual(set(record["detail"]), set(BUILDER.DETAIL_FIELDS))
            self.assertEqual(tuple(record["detail"]["artwork"]), BUILDER.ARTWORK_FIELDS)

        self.assertEqual(len({record["list"]["goodsId"] for record in self.records}), 145)
        self.assertEqual(
            len({record["list"]["goodsCoPurchaseId"] for record in self.records}), 145
        )
        self.assertEqual(
            (self.records[0]["sequence"], self.records[0]["page"], self.records[0]["list"]["goodsId"]),
            (1, 1, 166),
        )
        self.assertEqual(
            (
                self.records[-1]["sequence"],
                self.records[-1]["page"],
                self.records[-1]["list"]["goodsId"],
            ),
            (145, 15, 15),
        )

        observed_orders = Counter(tuple(record["detail"]) for record in self.records)
        declared_orders = {
            tuple(row["fields"]): row["record_count"]
            for row in self.track["detail_fields"]["observed_top_level_key_orders"]
        }
        self.assertEqual(dict(observed_orders), declared_orders)
        self.assertEqual(sorted(observed_orders.values()), [37, 108])

    def test_list_detail_cross_checks_and_artist_redaction(self):
        for record in self.records:
            listing = record["list"]
            detail = record["detail"]
            artist = detail["artwork"]["artist"]
            self.assertEqual(tuple(artist), BUILDER.PUBLIC_ARTIST_FIELDS)
            self.assertEqual(tuple(artist["_redactedFields"]), BUILDER.REDACTED_ARTIST_FIELDS)
            self.assertTrue(set(BUILDER.REDACTED_ARTIST_FIELDS).isdisjoint(artist.keys()))
            self.assertEqual(detail["id"], listing["goodsId"])
            self.assertEqual(detail["name"], listing["goodsName"])
            self.assertEqual(detail["investBeginDateTime"], listing["investBeginDateTime"])
            self.assertEqual(detail["investEndDateTime"], listing["investEndDateTime"])
            self.assertEqual(detail["saleYieldPercent"], listing["saleYieldPercent"])
            self.assertEqual(detail["statusCategoryCode"], listing["coPurchaseStatusCategory"])
            self.assertEqual(detail["status"], listing["coPurchaseStatus"])
            self.assertEqual(artist["artistNameForKorean"], listing["artistNameForKorean"])
            self.assertEqual(artist["artistNameForEnglish"], listing["artistNameForEnglish"])
            self.assertIn(listing["representativeGoodsImageUrl"], detail["imageList"]["list"])

        self.assertEqual(
            self.track["redaction"],
            {
                "scope": "artist_profile",
                "preserved_public_artist_fields": [
                    "id",
                    "artistName",
                    "artistNameForEnglish",
                    "artistNameForKorean",
                ],
                "removed_fields": list(BUILDER.REDACTED_ARTIST_FIELDS),
                "original_redacted_values_included": False,
                "records_with_exact_redaction_marker": 145,
                "member_account_or_session_values_included": False,
            },
        )

    def test_status_numeric_blank_image_and_long_content_metadata(self):
        self.assertEqual(
            Counter(
                (
                    record["list"]["coPurchaseStatusCategory"],
                    record["list"]["coPurchaseStatus"],
                )
                for record in self.records
            ),
            {
                ("RECRUITED", "BOUGHT"): 93,
                ("DISTRIBUTED", "DISTRIBUTED"): 52,
            },
        )
        self.assertEqual(
            self.track["distributions"]["saleYieldPercent"],
            {"min": 0, "max": 161.19, "positive": 52, "zero": 93, "negative": 0},
        )
        self.assertEqual(
            self.track["distributions"]["goodsDetail"], {"true": 128, "false": 17}
        )
        blank_values = self.track["distributions"]["blank_values"]
        self.assertEqual(blank_values["titleForKorean"], {
            "null": 22,
            "empty_string": 81,
            "whitespace_only": 0,
            "other": 42,
        })
        self.assertEqual(blank_values["titleForEnglish"], {
            "null": 3,
            "empty_string": 8,
            "whitespace_only": 0,
            "other": 134,
        })
        self.assertEqual(blank_values["dday"]["empty_string"], 145)
        self.assertEqual(blank_values["dDay"]["empty_string"], 145)
        self.assertTrue(all(record["list"]["dday"] == "" for record in self.records))
        self.assertTrue(all(record["list"]["dDay"] == "" for record in self.records))

        self.assertEqual(
            self.track["detail_image_urls"],
            {
                "image_list_count": 400,
                "artwork_image_count": 145,
                "total_count": 545,
                "unique_count": 545,
                "files_copied": False,
            },
        )
        self.assertEqual(
            self.track["detail_content"],
            {
                "included": False,
                "reason": "long_form_html_marketing_copy_and_images_excluded",
                "total_sections": 1071,
                "type_counts": {
                    "ARTWORK_INFO": 145,
                    "ART_DIRECTOR": 154,
                    "GOODS_NEWS": 344,
                    "INVEST": 398,
                    "SUMMARY": 30,
                },
            },
        )
        self.assertTrue(all("content" not in record["detail"] for record in self.records))

    def test_sources_are_first_party_canonical_and_tied_to_each_record(self):
        self.assertEqual(len(self.payload["sources"]), 6)
        urls = all_urls(self.payload)
        self.assertGreater(len(urls), 1_000)
        for url in urls:
            parsed = urlparse(url)
            self.assertEqual(parsed.scheme, "https")
            self.assertIsNotNone(parsed.hostname)
            self.assertFalse(parsed.username)
            self.assertFalse(parsed.password)
            self.assertFalse(any(key.lower().startswith("utm_") for key, _ in parse_qsl(parsed.query)))
        self.assertTrue(
            all(urlparse(source["url"]).hostname == "weshareart.com" for source in self.payload["sources"])
        )

        for record in self.records:
            goods_id = record["list"]["goodsId"]
            page = record["page"]
            sources = record["source_urls"]
            self.assertEqual(sources["goods_page"], f"https://weshareart.com/goodsDetail/{goods_id}")
            self.assertEqual(
                sources["list_api"],
                "https://weshareart.com/api/public/goods/co-purchase/page"
                f"?page={page}&size=10&coPurchaseStatusCategory=ALL",
            )
            self.assertEqual(
                sources["detail_api"], f"https://weshareart.com/api/public/goods?id={goods_id}"
            )
            self.assertEqual(
                sources["detail_content_api"],
                "https://weshareart.com/api/public/goods/detail/list-by-goods-id"
                f"?goodsId={goods_id}",
            )

    def test_suitability_questions_answers_api_behavior_and_privacy(self):
        questions = self.suitability["questions"]
        self.assertEqual(len(questions), 10)
        self.assertEqual([question["index"] for question in questions], list(range(1, 11)))
        self.assertEqual([question["source_label"] for question in questions], list("ABCDEFGHIJ"))
        self.assertTrue(all(len(question["options"]) == 2 for question in questions))
        self.assertTrue(all(all(option for option in question["options"]) for question in questions))
        self.assertEqual(
            [question["correct_option"] for question in questions],
            [2, 2, 2, 2, 2, 2, 1, 2, 1, 2],
        )
        self.assertEqual(self.suitability["answer_numbering"], "one_based")
        self.assertEqual(self.suitability["client_answer_index_numbering"], "zero_based")
        self.assertEqual(self.suitability["validity_years"], 2)

        calls = self.suitability["api_flow"]["calls"]
        self.assertEqual(
            {(call["method"], call["path"]) for call in calls},
            {
                ("GET", "/api/public/signed-in"),
                ("PUT", "/api/public/invest-tendency"),
                ("GET", "/api/public/v2/member/invest/investor-info"),
                ("GET", "/api/public/invest-tendency-if-exists"),
            },
        )
        self.assertTrue(all(call["called_during_collection"] is False for call in calls))
        self.assertTrue(all(call["personal_value_included"] is False for call in calls))
        self.assertEqual(
            [call["path"] for call in calls if call["mutates_state"]],
            ["/api/public/invest-tendency"],
        )
        self.assertIsNone(self.suitability["api_flow"]["completion_request_body"])
        self.assertFalse(self.suitability["api_flow"]["write_request_invoked_during_collection"])
        self.assertFalse(
            self.suitability["api_flow"]["authenticated_member_queries_invoked_during_collection"]
        )

        behavior = self.suitability["behavior"]
        self.assertTrue(behavior["requires_all_correct"])
        self.assertFalse(behavior["numeric_score_calculation"])
        self.assertFalse(behavior["risk_profile_classification"])
        self.assertTrue(behavior["scrolls_to_first_unanswered_or_wrong"])
        self.assertEqual(behavior["scroll_trigger"], "immediately_after_correct_answer")
        self.assertEqual(behavior["server_side_answer_revalidation"], "unconfirmed")
        self.assertEqual(
            self.suitability["success_and_failure_ui"]["success_modal_text"],
            [
                "이제 청약이 가능합니다!",
                "투자계약증권 적합성 테스트를 모두 완료하셨습니다.",
                "만기 예정일자",
                "청약 상품 바로가기",
            ],
        )
        self.assertTrue(all(value is False for value in self.suitability["privacy"].values()))

        for forbidden in (
            "JSESSIONID",
            "Set-Cookie",
            "Authorization: Bearer",
            '"memberInfo"',
            '"expiredDate"',
            "data:image/",
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_content",
        ):
            self.assertNotIn(forbidden.lower(), self.raw.lower())

    def test_builder_has_only_local_inputs_and_atomic_output_pattern(self):
        self.assertEqual(BUILDER.TRACK_SOURCE, TRACK_SOURCE_PATH)
        self.assertEqual(BUILDER.SUITABILITY_SOURCE, SUITABILITY_SOURCE_PATH)
        self.assertEqual(BUILDER.OUTPUT, DATA_PATH)
        source = BUILDER_PATH.read_text(encoding="utf-8")
        self.assertNotIn("/tmp", source)
        self.assertNotIn("import requests", source)
        self.assertNotIn("urllib.request", source)
        self.assertNotIn("urlopen(", source)
        self.assertNotIn("http.client", source)
        self.assertNotIn("socket", source)
        self.assertIn("dir=output.parent", source)
        self.assertIn("os.replace(temporary, output)", source)
        self.assertTrue(self.payload["validation"]["network_used"] is False)
        self.assertTrue(self.payload["validation"]["system_temp_directory_used"] is False)


if __name__ == "__main__":
    unittest.main()
