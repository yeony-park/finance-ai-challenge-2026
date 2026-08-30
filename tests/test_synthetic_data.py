import json
import re
import unittest
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/synthetic/art-investment.json"
OPEN_DART_HOSTS = {"dart.fss.or.kr", "englishdart.fss.or.kr", "opendart.fss.or.kr", "api.odcloud.kr"}
FORBIDDEN_KEYS = {"sourcePayload", "dueDiligencePayload", "sourceSnapshot", "legacySourceRef"}


def walk(value):
    yield value
    if isinstance(value, dict):
        for key, child in value.items():
            yield key
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


class SyntheticDataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = DATA_PATH.read_text(encoding="utf-8")
        cls.data = json.loads(cls.raw)
        cls.offerings = {item["id"]: item for item in cls.data["offerings"]}
        cls.artworks = {item["id"]: item for item in cls.data["artworks"]}
        cls.artists = {item["id"]: item for item in cls.data["artists"]}
        cls.platforms = {item["id"]: item for item in cls.data["platforms"]}
        cls.issuers = {item["id"]: item for item in cls.data["issuers"]}
        cls.auctions = {item["id"]: item for item in cls.data["auctions"]}
        cls.comparables = cls.data["comparables"]
        cls.records = cls.data["trackRecords"]

    def test_fixture_counts_and_synthetic_identity(self):
        self.assertEqual(len(self.offerings), 9)
        self.assertEqual(len(self.records), 318)
        for collection in (self.offerings, self.artworks, self.artists, self.platforms, self.issuers, self.auctions):
            self.assertTrue(all(item_id.startswith("synthetic-") for item_id in collection))
        self.assertTrue(all(item["nameKo"].startswith("가상") for item in self.artists.values()))
        self.assertTrue(all(item["isDemo"] and item["recordScope"] == "current" for item in self.offerings.values()))
        self.assertTrue(all(item["recordScope"] == "historical" for item in self.records))

    def test_relationships_are_closed_over_fixture_collections(self):
        for platform in self.platforms.values():
            self.assertTrue(set(platform["issuerIds"]) <= set(self.issuers))
        for issuer in self.issuers.values():
            self.assertTrue(set(issuer["platformIds"]) <= set(self.platforms))
        for offering in self.offerings.values():
            self.assertIn(offering["artistId"], self.artists)
            self.assertIn(offering["artworkId"], self.artworks)
            self.assertIn(offering["platformId"], self.platforms)
            self.assertIn(offering["issuerId"], self.issuers)
        for artwork in self.artworks.values():
            self.assertIn(artwork["artistId"], self.artists)
        for auction in self.auctions.values():
            self.assertIn(auction["artistId"], self.artists)
        for comparable in self.comparables:
            self.assertIn(comparable["offeringId"], self.offerings)
            self.assertIn(comparable["auctionRecordId"], self.auctions)
        evidence_ids = {item["id"] for item in self.data["evidence"]}
        for analysis in self.data["analyses"]:
            self.assertIn(analysis["offeringId"], self.offerings)
            self.assertTrue(set(analysis["evidenceIds"]) <= evidence_ids)

    def test_arithmetic_formulas(self):
        for offering in self.offerings.values():
            self.assertEqual(offering["unitPrice"] * offering["numberOfUnits"], offering["totalOfferingAmount"])
            costs = sum(item["amount"] for item in offering["disclosedCosts"])
            self.assertGreaterEqual(offering["totalOfferingAmount"] - offering["acquisitionPrice"] - costs, 0)
        for record in self.records:
            if record["exitAmount"] is None:
                self.assertIsNone(record["finalReturn"])
                self.assertIsNone(record["calculatedSettlementReturnPct"])
                continue
            expected = round(((record["exitAmount"] + (record["totalDistribution"] or 0)) / record["offeringAmount"] - 1) * 100, 2)
            self.assertEqual(record["finalReturn"], expected)
            self.assertEqual(record["calculatedSettlementReturnPct"], expected)
        for comparable in self.comparables:
            self.assertGreaterEqual(comparable["similarityScore"], 0)
            self.assertLessEqual(comparable["similarityScore"], 1)

    def test_local_images_are_present_and_not_remote(self):
        image_rows = [*self.artworks.values(), *self.artists.values()]
        self.assertTrue(image_rows)
        for item in image_rows:
            image = item["imageUrl"]
            self.assertTrue(image.startswith("/") and not image.startswith("//"))
            self.assertFalse(re.match(r"https?://", image, re.I))
            self.assertTrue((ROOT / "public" / image.lstrip("/")).is_file(), image)
        self.assertTrue(all(record["artworkImageUrl"] is None for record in self.records))

    def test_distributions_and_date_status_coherence(self):
        source_counts = Counter(record["sourceDataset"] for record in self.records)
        status_counts = Counter(record["status"] for record in self.records)
        self.assertEqual(sum(source_counts.values()), len(self.records))
        self.assertTrue(all(value > 0 for value in source_counts.values()))
        self.assertEqual(sum(status_counts.values()), len(self.records))
        self.assertTrue({"operating", "exit_in_progress", "sold", "liquidated", "delayed", "returned"} <= set(status_counts))
        self.assertTrue(set(status_counts) <= {"operating", "exit_in_progress", "sold", "liquidated", "delayed", "returned", "loss_confirmed"})
        for record in self.records:
            self.assertLessEqual(date.fromisoformat(record["subscriptionStart"]), date.fromisoformat(record["subscriptionEnd"]))
            status = record["status"]
            if record["soldAt"]:
                self.assertGreaterEqual(date.fromisoformat(record["soldAt"]), date.fromisoformat(record["subscriptionEnd"]))
            if record["liquidatedAt"]:
                self.assertIsNotNone(record["soldAt"])
                self.assertGreaterEqual(date.fromisoformat(record["liquidatedAt"]), date.fromisoformat(record["soldAt"]))
            if status == "operating":
                self.assertIsNone(record["soldAt"])
                self.assertIsNone(record["liquidatedAt"])
            elif status == "exit_in_progress":
                self.assertIsNotNone(record["soldAt"])
                self.assertIsNone(record["liquidatedAt"])
            elif status in {"sold", "liquidated", "delayed", "loss_confirmed"}:
                self.assertIsNotNone(record["exitAmount"])
            elif status == "returned":
                self.assertIsNone(record["soldAt"])
                self.assertIsNotNone(record["exitAmount"])

    def test_no_legacy_payload_fields_or_non_open_dart_urls(self):
        for value in walk(self.data):
            if isinstance(value, str) and re.match(r"^https?://", value, re.I):
                host = (urlparse(value).hostname or "").lower().rstrip(".")
                self.assertTrue(host in OPEN_DART_HOSTS or host.endswith(".dart.fss.or.kr"), value)
            if isinstance(value, str):
                self.assertNotIn("data:image/", value)
        keys = [value for value in walk(self.data) if isinstance(value, str)]
        for key in FORBIDDEN_KEYS:
            self.assertNotIn(key, keys)
            self.assertNotIn(key, self.raw)
        self.assertTrue(all(evidence["sourceUrl"] is None for evidence in self.data["evidence"]))


if __name__ == "__main__":
    unittest.main()
