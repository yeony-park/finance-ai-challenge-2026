import hashlib
import http.client
import importlib.util
import json
import threading
import unittest
from collections import Counter
from http.server import ThreadingHTTPServer
from pathlib import Path

import server

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/artnguide_track_records.json"
SOURCE_PATH = ROOT / "deliverables/artnguide_artwork_track_records_2026-08-10.md"
SPEC = importlib.util.spec_from_file_location(
    "build_artnguide_track_records", ROOT / "scripts/build_artnguide_track_records.py"
)
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


class ArtnguideDataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
        cls.records = cls.payload["records"]
        cls.annotations = cls.payload["record_annotations"]
        cls.by_id = {record["id"]: record for record in cls.records}
        cls.annotation_by_id = {row["id"]: row for row in cls.annotations}

    def test_generated_snapshot_matches_evidence_document(self):
        rebuilt = BUILDER.build_payload()
        self.assertEqual(rebuilt, self.payload)
        source_hash = hashlib.sha256(SOURCE_PATH.read_bytes()).hexdigest()
        self.assertEqual(source_hash, self.payload["dataset"]["source_document_sha256"])
        self.assertEqual(source_hash, "fc867aa34c2ecae8c50458f4e2590d6500ecfe93a5125df04c71807743cad507")

    def test_exact_record_schema_order_and_pagination(self):
        self.assertEqual(len(self.records), 187)
        self.assertEqual(len(self.annotations), 187)
        self.assertEqual(len({record["id"] for record in self.records}), 187)
        self.assertTrue(all(tuple(record) == BUILDER.RAW_FIELDS for record in self.records))
        self.assertEqual([row["sequence"] for row in self.annotations], list(range(1, 188)))
        self.assertEqual(
            [sum(row["page"] == page for row in self.annotations) for page in range(1, 20)],
            [10] * 18 + [7],
        )
        self.assertEqual(
            [record["id"] for record in self.records],
            [row["id"] for row in self.annotations],
        )

    def test_counts_ranges_and_known_source_discrepancies(self):
        self.assertEqual(
            Counter(record["status"] for record in self.records),
            {"TRANSFER": 138, "RETURNED_PRODUCT": 12, "EXPECTED_TRANSFER": 37},
        )
        self.assertEqual(
            Counter(record["oldGpVersion"] for record in self.records),
            {True: 175, False: 12},
        )
        self.assertEqual(
            self.payload["distributions"]["startAt"],
            {
                "min": "2018-10-30T01:00:00.000Z",
                "max": "2026-02-05T01:00:00.000Z",
            },
        )
        self.assertEqual(
            self.payload["recomputed_stats"],
            {
                "record_count": 187,
                "total_gp_money_krw": 49_598_300_000,
                "completed_count": 150,
                "total_sold_money_krw": 41_513_812_500,
            },
        )
        self.assertEqual(
            [item["difference"] for item in self.payload["known_discrepancies"]["items"]],
            [1, 3_000_000, 1, 7_400_000],
        )
        self.assertEqual(self.payload["known_discrepancies"]["cause"], "확인 불가")

    def test_null_empty_whitespace_and_zero_are_not_normalized(self):
        expected = [record for record in self.records if record["status"] == "EXPECTED_TRANSFER"]
        self.assertEqual(len(expected), 37)
        for record in expected:
            self.assertEqual(record["soldMoney"], 0)
            self.assertIsNone(record["soldTime"])
            self.assertIsNone(record["profit"])
            self.assertIsNone(record["dateHold"])
            self.assertIsNone(record["yearProfit"])
        self.assertEqual(self.by_id[16]["profit"], 0)
        self.assertEqual(self.by_id[16]["yearProfit"], 0)
        self.assertEqual(self.annotation_by_id[16]["display"]["profit"], "-")
        self.assertEqual(self.payload["distributions"]["soldNote"]["null"], 21)
        self.assertEqual(self.payload["distributions"]["soldNote"]["empty_string"], 166)
        self.assertEqual(self.payload["distributions"]["soldPlace"]["null"], 2)
        self.assertEqual(self.payload["distributions"]["soldPlace"]["empty_string"], 14)
        self.assertEqual(self.payload["distributions"]["yearItem"]["whitespace_only"], 8)
        self.assertEqual(self.payload["distributions"]["artMaterial"]["whitespace_only"], 1)
        self.assertEqual(self.by_id[199]["yearItem"], " 2003")
        self.assertEqual(self.by_id[199]["artMaterial"], " colored pencil on envelope")

    def test_source_text_display_dates_and_labels_are_preserved(self):
        self.assertEqual(self.by_id[93]["title"], "Burnt Umber & Ultramarine Blue")
        self.assertNotIn("&amp;", self.by_id[93]["title"])
        first = self.annotation_by_id[6]["display"]
        self.assertEqual(first["start_date_kst"], "2018.10.30")
        self.assertEqual(first["sold_date_kst"], "2018.12.24")
        status_labels = {
            "TRANSFER": "매각완료",
            "RETURNED_PRODUCT": "매각완료",
            "EXPECTED_TRANSFER": "매각예정",
        }
        for record, annotation in zip(self.records, self.annotations):
            display = annotation["display"]
            expected_type = "청약" if display["start_date_kst"] > "2023.08.31" else "공동구매"
            self.assertEqual(display["transaction_type"], expected_type)
            self.assertEqual(display["status_label"], status_labels[record["status"]])
        self.assertTrue(any(record["authorName"] == "공부차" for record in self.records))

    def test_snapshot_contains_no_credentials_or_copied_image_payloads(self):
        raw = DATA_PATH.read_text(encoding="utf-8")
        for secret_name in (
            "COMMERCIAL_API_KEY",
            "LAND_API_KEY",
            "BUILDING_API_KEY",
            "VWORLD_API_KEY",
            "DART_API_KEY",
        ):
            self.assertNotIn(secret_name, raw)
        self.assertNotIn("data:image/", raw)
        self.assertFalse(self.payload["validation"]["thumbnail_files_copied"])

    def test_dedicated_api_and_static_paths_are_isolated(self):
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        try:
            connection = http.client.HTTPConnection("127.0.0.1", httpd.server_port)
            connection.request("GET", "/api/track-records/artnguide")
            response = connection.getresponse()
            body = response.read()
            self.assertEqual(response.status, 200)
            self.assertEqual(response.getheader("Cache-Control"), "no-store")
            self.assertEqual(response.getheader("Content-Type"), "application/json; charset=utf-8")
            self.assertEqual(json.loads(body), self.payload)
            connection.close()

            connection = http.client.HTTPConnection("127.0.0.1", httpd.server_port)
            connection.request("HEAD", "/api/track-records/artnguide")
            response = connection.getresponse()
            self.assertEqual(response.status, 200)
            self.assertEqual(response.read(), b"")
            connection.close()

            connection = http.client.HTTPConnection("127.0.0.1", httpd.server_port)
            connection.request("GET", "/data/artnguide_track_records.json")
            response = connection.getresponse()
            self.assertEqual(response.status, 200)
            self.assertEqual(response.getheader("Cache-Control"), "public, max-age=300")
            self.assertEqual(response.read(), DATA_PATH.read_bytes())
            connection.close()

            connection = http.client.HTTPConnection("127.0.0.1", httpd.server_port)
            connection.request("GET", "/data/source_snapshots.json")
            response = connection.getresponse()
            self.assertEqual(response.status, 404)
            response.read()
            connection.close()
        finally:
            httpd.shutdown()
            httpd.server_close()


if __name__ == "__main__":
    unittest.main()
