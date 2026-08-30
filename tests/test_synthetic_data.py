import json
import hashlib
import re
import unittest
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/synthetic/art-investment.json"
LIVE_DATA_PATH = ROOT / "live/data/synthetic/art-investment.json"
HISTORY_PUBLIC_DIR = ROOT / "public/synthetic-art/history"
HISTORY_LIVE_DIR = ROOT / "live/synthetic-art/history"
SVG_NAMESPACE = "http://www.w3.org/2000/svg"
SVG_TAG = f"{{{SVG_NAMESPACE}}}svg"
TITLE_PATTERN = re.compile(
    r"^(?P<series_ko>[^—]+?)\s+—\s+(?P<secondary_ko>[^·]+?)"
    r"\s+·\s+(?P<series_en>[^/]+?)\s*/\s*(?P<secondary_en>.+?)$"
)
TITLE_SUFFIX_PATTERN = re.compile(
    r"(?i)(?:\d+|first|second|third|fourth|fifth|sixth|seventh|eighth|"
    r"ninth|tenth|eleventh|twelfth|study|variation|variant|state|phase|"
    r"version|edition|series|set)\s*$"
)
KOREAN_TITLE_SUFFIX_PATTERN = re.compile(
    r"(?:\d+|첫째?|둘째|셋째|넷째|다섯째|여섯째|일곱째|여덟째|아홉째|열째|"
    r"번째)\s*$"
)
HISTORY_TAGS = {"svg", "title", "rect", "circle", "ellipse", "g", "line", "path", "polygon", "text"}
HISTORY_ATTRIBUTES = {
    "aria-label", "cx", "cy", "data-index", "data-record-id", "data-record-index",
    "data-seed", "d", "fill", "fill-opacity", "font-family", "font-size", "height",
    "letter-spacing", "opacity", "points", "r", "role", "rx", "ry", "stroke",
    "stroke-linecap", "stroke-dasharray", "stroke-linejoin", "stroke-opacity",
    "stroke-width", "text-anchor", "transform", "viewBox", "width", "x", "x1", "x2", "y",
    "y1", "y2",
}
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

    def test_current_offerings_use_uniform_unit_and_minimum_prices(self):
        self.assertEqual(len(self.offerings), 9)
        for offering in self.offerings.values():
            self.assertEqual(offering["unitPrice"], 100000, offering["id"])
            self.assertEqual(offering["minimumInvestment"], 100000, offering["id"])

    def test_history_artwork_metadata_is_unique_and_platform_scoped(self):
        titles = [record["artworkTitle"] for record in self.records]
        self.assertEqual(len(titles), 318)
        self.assertEqual(len(set(titles)), 318)

        parsed_titles = []
        for title in titles:
            match = TITLE_PATTERN.fullmatch(title)
            self.assertIsNotNone(match, title)
            parsed_titles.append(match.groupdict())
        secondary_ko = [item["secondary_ko"].strip() for item in parsed_titles]
        secondary_en = [item["secondary_en"].strip() for item in parsed_titles]
        self.assertEqual(len(set(secondary_ko)), 318)
        self.assertEqual(len(set(secondary_en)), 318)
        for phrase in secondary_ko:
            self.assertNotRegex(phrase, r"\d")
            self.assertIsNone(KOREAN_TITLE_SUFFIX_PATTERN.search(phrase), phrase)
        for phrase in secondary_en:
            self.assertNotRegex(phrase, r"\d")
            self.assertIsNone(TITLE_SUFFIX_PATTERN.search(phrase), phrase)

        artist_pairs = [(record["artistName"], record["artistNameEn"]) for record in self.records]
        artist_counts = Counter(artist_pairs)
        self.assertEqual(len(artist_counts), 32)
        self.assertTrue(all(9 <= count <= 12 for count in artist_counts.values()))

        artist_platforms = {}
        for record, artist_pair in zip(self.records, artist_pairs):
            artist_platforms.setdefault(artist_pair, set()).add(record["platformId"])
        self.assertTrue(all(len(platforms) == 1 for platforms in artist_platforms.values()))

        self.assertGreaterEqual(len({record["artworkMedium"] for record in self.records}), 12)
        self.assertTrue(all(record["offeringId"] is None for record in self.records))

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

    def test_track_record_images_are_unique_and_mirrored(self):
        image_urls = [record["artworkImageUrl"] for record in self.records]
        self.assertEqual(len(image_urls), 318)
        self.assertEqual(len(set(image_urls)), 318)
        expected_names = {f"{record['id']}.svg" for record in self.records}
        for directory in (HISTORY_PUBLIC_DIR, HISTORY_LIVE_DIR):
            self.assertTrue(directory.is_dir(), directory)
            entries = list(directory.iterdir())
            self.assertEqual({entry.name for entry in entries}, expected_names)
            self.assertTrue(all(entry.is_file() and not entry.is_symlink() for entry in entries))

        content_hashes = []
        for record, image_url in zip(self.records, image_urls):
            expected = f"/synthetic-art/history/{record['id']}.svg"
            self.assertEqual(image_url, expected)
            public_path = ROOT / "public" / image_url.lstrip("/")
            live_path = ROOT / "live" / image_url.lstrip("/")
            public_bytes = public_path.read_bytes()
            self.assertEqual(public_bytes, live_path.read_bytes(), image_url)
            for svg_path in (public_path, live_path):
                svg_root = ET.parse(svg_path).getroot()
                title = svg_root.find(f"{{{SVG_NAMESPACE}}}title")
                self.assertIsNotNone(title, svg_path)
                self.assertEqual(title.text, record["artworkTitle"], svg_path)
            content_hashes.append(hashlib.sha256(public_bytes).hexdigest())
        self.assertEqual(len(set(content_hashes)), 318)

    def test_history_svg_is_valid_local_narrow_synthetic_art(self):
        external_ref = re.compile(r"(?i)(?:https?:|data:|file:|ftp:|javascript:|//|url\s*\()")
        for path in sorted(HISTORY_PUBLIC_DIR.iterdir()):
            raw = path.read_text(encoding="utf-8")
            root = ET.fromstring(raw)
            self.assertEqual(root.tag, SVG_TAG, path)
            self.assertEqual(root.attrib.get("viewBox"), "0 0 800 1000", path)
            self.assertEqual(raw.count("SYNTHETIC"), 1, path)
            without_namespace = re.sub(
                r'''xmlns\s*=\s*(['"])''' + re.escape(SVG_NAMESPACE) + r'''\1''',
                "",
                raw,
                flags=re.IGNORECASE,
            )
            self.assertIsNone(external_ref.search(without_namespace), path)
            self.assertNotRegex(raw, r"(?is)<\s*(?:script|foreignObject|iframe|image|use|style)\b", path)
            for element in root.iter():
                self.assertIn(element.tag.rsplit("}", 1)[-1], HISTORY_TAGS, path)
                self.assertTrue(all(not name.startswith("{") and name in HISTORY_ATTRIBUTES for name in element.attrib), path)
                self.assertFalse(any(external_ref.search(value) for value in element.attrib.values()), path)

    def test_current_and_historical_art_records_have_images(self):
        current_images = [self.artworks[offering["artworkId"]]["imageUrl"] for offering in self.offerings.values()]
        historical_images = [record["artworkImageUrl"] for record in self.records]
        self.assertTrue(all(current_images))
        self.assertTrue(all(historical_images))

    def test_live_dataset_mirrors_source(self):
        self.assertEqual(DATA_PATH.read_bytes(), LIVE_DATA_PATH.read_bytes())

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
