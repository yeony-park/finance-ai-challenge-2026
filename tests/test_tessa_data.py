import hashlib
import json
import re
import unittest
from decimal import Decimal, ROUND_DOWN
from pathlib import Path
from urllib.parse import parse_qsl, urlparse


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/tessa_sale_records.json"
SOURCE_PATH = ROOT / "deliverables/tessa_artwork_sale_disclosures_2026-08-10.md"


class TessaDataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
        cls.source = SOURCE_PATH.read_text(encoding="utf-8")

    def test_source_document_and_hash(self):
        dataset = self.data["dataset"]
        self.assertEqual(dataset["source_document"], str(SOURCE_PATH.relative_to(ROOT)))
        self.assertEqual(
            dataset["source_document_sha256"],
            hashlib.sha256(SOURCE_PATH.read_bytes()).hexdigest(),
        )
        self.assertEqual(dataset["mode"], "manual_normalization")
        self.assertEqual(dataset["evidence_scope"], "first_party_self_reported")
        self.assertEqual(dataset["independent_verification_status"], "not_performed")
        self.assertEqual(dataset["legal_issuer_mapping_status"], "unverified")
        self.assertEqual(
            dataset["legal_issuer"],
            {"verification_status": "pending", "id": None, "name": None},
        )

    def test_counts_and_identifiers(self):
        dataset = self.data["dataset"]
        records = self.data["records"]
        ids = [record["disclosure_id"] for record in records]
        attachments = [item for record in records for item in record["attachments"]]
        self.assertEqual(dataset["source_disclosure_count"], 137)
        self.assertEqual(dataset["source_category_counts"], {"정기공시": 93, "수시공시": 44})
        self.assertEqual(dataset["record_count"], len(records), 6)
        self.assertEqual(dataset["attachment_count"], len(attachments), 12)
        self.assertEqual(len(set(ids)), 6)
        self.assertEqual(len({item["url"] for item in attachments}), 12)
        self.assertEqual(self.data["validation"]["duplicate_disclosure_ids"], 0)

    def test_stable_ids_templates_and_attachment_manifest(self):
        records = self.data["records"]
        expected_ids = ["1410133", "1387646", "1068605", "1068604", "1068603", "1006292"]
        expected_templates = {
            "1410133": "profit_krw_v2",
            "1387646": "profit_krw_v2",
            "1068605": "profit_hkd_v1",
            "1068604": "profit_hkd_v1",
            "1068603": "profit_hkd_v1",
            "1006292": "legacy_sale_krw",
        }
        self.assertEqual([record["disclosure_id"] for record in records], expected_ids)
        for record in records:
            disclosure_id = record["disclosure_id"]
            self.assertEqual(record["record_id"], f"tessa:forum:{disclosure_id}")
            self.assertEqual(record["template_family"], expected_templates[disclosure_id])
            self.assertEqual(len(record["attachments"]), 2)
            for attachment in record["attachments"]:
                parsed = urlparse(attachment["url"])
                self.assertEqual(parsed.scheme, "https")
                self.assertEqual(parsed.hostname, "dbm9jhyrx0h6k.cloudfront.net")
                self.assertEqual(attachment["content_type"], "application/pdf")
                self.assertEqual(attachment["page_count"], 1)
                self.assertGreater(attachment["bytes"], 0)
                self.assertRegex(attachment["sha256"], r"^[0-9a-f]{64}$")

    def test_calculations_and_units(self):
        for record in self.data["records"]:
            initial = Decimal(str(record["initial_price"]["amount_krw"]))
            settlement = Decimal(str(record["settlement"]["amount_krw"]))
            units = Decimal(str(record["settlement"]["total_units"]))
            expected_return = (settlement / initial - Decimal(1)) * Decimal(100)
            self.assertAlmostEqual(
                float(expected_return), record["calculated_settlement_return_pct"], places=12
            )
            self.assertEqual(
                record["calculated_settlement_return_display"], f"{expected_return:+.6f}%"
            )
            expected_unit = (settlement / units).quantize(Decimal("0.000001"), rounding=ROUND_DOWN)
            self.assertEqual(Decimal(str(record["settlement"]["per_unit_krw"])), expected_unit)
        fee_records = {record["disclosure_id"]: record for record in self.data["records"]}
        self.assertIn("0.70원", fee_records["1410133"]["sale_fee"]["note"])
        self.assertIn("0.40원", fee_records["1387646"]["sale_fee"]["note"])
        liu = fee_records["1006292"]
        recalculation = liu["source_reported_return_recalculation"]
        expected = (
            Decimal(str(liu["sale_price"]["final_sale_amount_krw"]))
            / Decimal(str(liu["initial_price"]["amount_krw"]))
            - Decimal(1)
        ) * Decimal(100)
        self.assertAlmostEqual(float(expected), recalculation["arithmetic_pct"], places=12)
        self.assertAlmostEqual(
            float(expected - Decimal(str(liu["source_reported_return_pct"]))),
            recalculation["difference_from_reported_pct_point"],
            places=12,
        )
        self.assertEqual(recalculation["rounding_policy"], "not_disclosed")
        hkd_records = [
            fee_records[disclosure_id]
            for disclosure_id in ("1068605", "1068604", "1068603")
        ]
        for record in hkd_records:
            sale_price = record["sale_price"]
            converted = (
                Decimal(str(sale_price["net_after_expenses_amount"]))
                * Decimal(str(sale_price["conversion_rate_krw_per_currency"]))
            )
            difference = converted - Decimal(str(record["settlement"]["amount_krw"]))
            self.assertEqual(difference, Decimal("0.977"))
        self.assertIn("원문 정산 대상 금액보다 0.977원 크다", self.source)

    def test_payment_method_and_per_unit_raw_text_are_preserved(self):
        markdown_text = self.source.replace("`", "").replace("<br>", "\n")
        expected = {
            "1410133": ("분할 소유권 1좌당 정산 단가", "KRW 1,118.745465", "1,118.745465원"),
            "1387646": ("분할 소유권 1좌당 정산 단가", "KRW 1,041.480426", "1,041.480426원"),
            "1068605": ("분할 소유권 1좌당 정산 단가", "KRW 588.139942", "588.139942원"),
            "1068604": ("분할 소유권 1좌당 정산 단가", "KRW 769.951974", "769.951974원"),
            "1068603": ("분할 소유권 1좌당 정산 단가", "KRW 723.856321", "723.856321원"),
            "1006292": ("1 분할 소유권당 지급액", "KRW 1026.205949", "1,026.205949 원 (세전 금액)"),
        }
        for record in self.data["records"]:
            settlement = record["settlement"]
            label, calculation_raw, report_raw = expected[record["disclosure_id"]]
            self.assertEqual(settlement["per_unit_label"], label)
            self.assertEqual(settlement["per_unit_calculation_raw"], calculation_raw)
            self.assertEqual(settlement["per_unit_report_raw"], report_raw)
            self.assertTrue(settlement["payment_method_raw"])
            self.assertIn(calculation_raw, markdown_text)
            self.assertIn(report_raw, markdown_text)
            self.assertIn(settlement["payment_method_raw"], markdown_text)
        modern = self.data["records"][:5]
        self.assertTrue(
            all(
                record["settlement"]["payment_method_raw"]
                == "앱 내 [자산 > 신청하기] 화면을 통한 현금 지급\n(예치금에 산입)"
                for record in modern
            )
        )
        self.assertEqual(
            self.data["records"][5]["settlement"]["payment_method_raw"],
            "앱 내 투표/정산 화면을 통한 현금 지급 (예치금에 산입)",
        )

    def test_reported_return_null_zero_and_corrections_are_distinct(self):
        by_id = {record["disclosure_id"]: record for record in self.data["records"]}
        reported = [record for record in self.data["records"] if record["source_reported_return_pct"] is not None]
        self.assertEqual([record["disclosure_id"] for record in reported], ["1006292"])
        self.assertEqual(reported[0]["source_reported_return_pct"], 2.75)
        self.assertNotEqual(reported[0]["source_reported_return_pct"], reported[0]["calculated_settlement_return_pct"])
        self.assertEqual(
            (sum(record["calculated_settlement_return_pct"] > 0 for record in self.data["records"]),
             sum(record["calculated_settlement_return_pct"] < 0 for record in self.data["records"])),
            (3, 3),
        )
        for disclosure_id in ("1068605", "1068604", "1068603"):
            record = by_id[disclosure_id]
            self.assertEqual(record["sale_fee"]["amount_krw"], 0)
            self.assertTrue(all(item["amount"] == 0 for item in record["expenses"][:4]))
            self.assertEqual(
                record["settlement"]["recipient_fixed_date_label"],
                "정산대상자 확정일",
            )
        warhol = by_id["1410133"]
        self.assertIsNone(warhol["expenses"][0]["amount"])
        self.assertEqual(warhol["expenses"][0]["raw_value"], "-")
        liu = by_id["1006292"]
        self.assertEqual(liu["registration_timestamp"], "2024-02-27 17:31:07")
        self.assertEqual(liu["original_written_date"], "2023-08-03")
        self.assertEqual(liu["holding_period_days"], 516)
        self.assertEqual(liu["settlement"]["recipient_fixed_date_label"], "지급기준일")
        self.assertEqual(
            [(item["field"], item["before"], item["after"]) for item in liu["corrections"]],
            [("지급기준일", "2023-07-21", "2023-07-19"), ("보유기간", "518일", "516일")],
        )

    def test_links_are_public_references_without_tracking(self):
        urls = [source["url"] for source in self.data["sources"]]
        for record in self.data["records"]:
            urls.append(record["disclosure_url"])
            urls.extend(item["url"] for item in record["attachments"])
        for url in urls:
            parsed = urlparse(url)
            self.assertIn(parsed.scheme, {"http", "https"})
            self.assertTrue(parsed.hostname)
            self.assertFalse(parsed.username or parsed.password)
            self.assertFalse(any(key.lower().startswith("utm_") for key, _ in parse_qsl(parsed.query)))
        self.assertTrue(all(urlparse(source["url"]).scheme == "http" for source in self.data["sources"]))
        self.assertTrue(all(urlparse(record["disclosure_url"]).scheme == "http" for record in self.data["records"]))
        limitations = "\n".join(self.data["limitations"])
        self.assertIn("암호화되지 않은 HTTP 외부 링크", limitations)
        self.assertIn("암호화되지 않은 HTTP 링크", self.source)

    def test_timezone_and_private_data_boundaries(self):
        self.assertIsNone(self.data["dataset"]["registration_timestamp_timezone"])
        self.assertTrue(
            all(record["registration_timestamp_timezone"] is None for record in self.data["records"])
        )
        serialized = json.dumps(self.data, ensure_ascii=False)
        privacy_text = serialized + "\n" + self.source
        privacy_text_without_urls = re.sub(r"https?://\S+", "", privacy_text)
        private_patterns = {
            "email": r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}",
            "mobile_phone": r"(?<!\d)01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}(?!\d)",
            "landline_phone": r"(?<!\d)(?:02|0[3-6][1-5])[-\s.]?\d{3,4}[-\s.]?\d{4}(?!\d)",
            "resident_number": r"(?<!\d)\d{6}[-\s]?[1-4]\d{6}(?!\d)",
            "account_number": r"(?:계좌번호|bank_account)\s*[:：]?\s*\d{8,}",
            "structured_address": r"(?:자택주소|home_address|postal_code)\s*[:：]",
            "credential_or_member_key": r"\b(?:memberInfo|member_id|cookie|session|jwt|account_id|authorization|bearer)\b",
        }
        for label, pattern in private_patterns.items():
            self.assertNotRegex(
                privacy_text_without_urls,
                re.compile(pattern, re.I),
                f"private pattern detected: {label}",
            )
        self.assertNotIn("utm_", privacy_text.lower())
        self.assertFalse(self.data["validation"]["member_or_investor_personal_data_collected"])
        self.assertIn("회원·투자자 개인정보", self.source)
        self.assertIn("수집하거나 표시하지", "\n".join(self.data["limitations"]))
        self.assertFalse(any(ROOT.joinpath("data").glob("*.pdf")))

    def test_markdown_contains_every_normalized_record(self):
        for record in self.data["records"]:
            self.assertIn(record["disclosure_id"], self.source)
            self.assertIn(record["asset"]["artist"], self.source)
            self.assertIn(record["asset"]["title"], self.source)
            self.assertIn(record["registration_timestamp"], self.source)
            self.assertIn(f'{record["holding_period_days"]:,}일', self.source)
            self.assertIn(f'{record["initial_price"]["amount_krw"]:,}원', self.source)
            self.assertIn(f'{record["settlement"]["amount_krw"]:,}원', self.source)
            self.assertIn(record["calculated_settlement_return_display"], self.source)
            for attachment in record["attachments"]:
                self.assertIn(attachment["url"], self.source)


if __name__ == "__main__":
    unittest.main()
