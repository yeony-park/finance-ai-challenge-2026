#!/usr/bin/env python3
"""Validate the checked-in synthetic art fixture without external data."""
from __future__ import annotations

import json
import re
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/synthetic/art-investment.json"
DATA = json.loads(DATA_PATH.read_text(encoding="utf-8"))

EXPECTED_COLLECTIONS = {
    "dataMode", "offerings", "artworks", "artists", "auctions", "comparables", "platforms", "issuers",
    "trackRecords", "evidence", "analyses", "annualMetrics", "changeLogs",
}
FORBIDDEN_KEYS = {"sourcePayload", "dueDiligencePayload", "sourceSnapshot", "legacySourceRef"}
OPEN_DART_HOSTS = {"dart.fss.or.kr", "englishdart.fss.or.kr", "opendart.fss.or.kr", "api.odcloud.kr"}

assert set(DATA) == EXPECTED_COLLECTIONS
assert len(DATA["offerings"]) == 9
assert len(DATA["trackRecords"]) == 318
assert DATA_PATH.is_file()
assert DATA["dataMode"] == "synthetic"


def walk(value):
    yield value
    if isinstance(value, dict):
        for key, child in value.items():
            assert key not in FORBIDDEN_KEYS, f"forbidden legacy key: {key}"
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def assert_urls_are_safe(value):
    for child in walk(value):
        if not isinstance(child, str) or not re.match(r"^https?://", child, re.I):
            continue
        parsed = urlparse(child)
        assert parsed.hostname
        host = parsed.hostname.lower().rstrip(".")
        assert host in OPEN_DART_HOSTS or host.endswith(".dart.fss.or.kr"), child


def parse_day(value):
    return date.fromisoformat(value) if value else None


def parse_timestamp(value):
    return datetime.fromisoformat(value) if value else None


def ids(collection):
    return [item["id"] for item in collection]


assert_urls_are_safe(DATA)
serialized = DATA_PATH.read_text(encoding="utf-8")
for key in FORBIDDEN_KEYS:
    assert key not in serialized
assert all(item_id.startswith("synthetic-") for collection in DATA.values() if isinstance(collection, list) for item in collection if isinstance(item, dict) and "id" in item for item_id in [item["id"]])
assert all(key.startswith("synthetic-") for key in DATA["annualMetrics"])

artists = {item["id"]: item for item in DATA["artists"]}
artworks = {item["id"]: item for item in DATA["artworks"]}
platforms = {item["id"]: item for item in DATA["platforms"]}
issuers = {item["id"]: item for item in DATA["issuers"]}
offerings = {item["id"]: item for item in DATA["offerings"]}
auctions = {item["id"]: item for item in DATA["auctions"]}
comparables = {item["id"]: item for item in DATA["comparables"]}
evidence_by_id = {item["id"]: item for item in DATA["evidence"]}

assert len(artists) == len(DATA["artists"]) == 9
assert len(artworks) == len(DATA["artworks"]) == 9
assert len(platforms) == len(DATA["platforms"]) == 3
assert len(issuers) == len(DATA["issuers"]) == 3
assert len(auctions) == len(DATA["auctions"]) == 90
assert len(comparables) == len(DATA["comparables"]) == 45
assert len({item["id"] for item in DATA["trackRecords"]}) == len(DATA["trackRecords"])

for platform in platforms.values():
    assert platform["id"].startswith("synthetic-")
    assert platform["website"] is None
    assert set(platform["issuerIds"]) <= set(issuers)
for issuer in issuers.values():
    assert issuer["registrationNumber"] is None
    assert set(issuer["platformIds"]) <= set(platforms)
for offering in offerings.values():
    assert offering["isDemo"] is True
    assert offering["recordScope"] == "current"
    assert offering["identityStatus"] == "unverified"
    assert offering["lifecycle"] == "current"
    assert offering["status"] == "upcoming"
    assert offering["artistId"] in artists
    assert offering["artworkId"] in artworks
    assert offering["platformId"] in platforms
    assert offering["issuerId"] in issuers
    assert offering["unitPrice"] * offering["numberOfUnits"] == offering["totalOfferingAmount"]
    assert offering["subscriptionStart"] <= offering["subscriptionEnd"]
    assert parse_day(offering["asOfDate"]) < parse_day(offering["subscriptionStart"])
    assert sum(cost["amount"] for cost in offering["disclosedCosts"]) >= 0
for artwork in artworks.values():
    assert artwork["artistId"] in artists
    image = artwork["imageUrl"]
    assert image and image.startswith("/") and not image.startswith("//")
    assert (ROOT / "public" / image.lstrip("/")).is_file(), image
for artist in artists.values():
    assert "가상" in artist["nameKo"]
    image = artist["imageUrl"]
    assert image and image.startswith("/") and (ROOT / "public" / image.lstrip("/")).is_file(), image

for auction in auctions.values():
    assert auction["artistId"] in artists
    assert auction["verificationStatus"] == "synthetic"
    assert auction["currency"] == "KRW"
    if auction["result"] == "sold":
        assert auction["normalizedPriceKRW"] is not None
        assert auction["realizedPrice"] is not None
    else:
        assert auction["normalizedPriceKRW"] is None
        assert auction["realizedPrice"] is None
for comparable in comparables.values():
    assert comparable["offeringId"] in offerings
    assert comparable["auctionRecordId"] in auctions
    assert 0 <= comparable["similarityScore"] <= 1

for record in DATA["trackRecords"]:
    assert record["recordScope"] == "historical"
    assert record["identityStatus"] == "unverified"
    assert record["platformId"] in platforms
    assert record["issuerId"] in issuers
    assert record["sourceDataset"]
    assert record["currency"] == record["exitCurrency"] == "KRW"
    assert record["subscriptionStart"] <= record["subscriptionEnd"]
    assert record["targetHoldingMonths"] > 0
    assert record["offeringAmount"] > 0
    assert record["status"] == record["lifecycle"] or (record["status"] == "delayed" and record["lifecycle"] == "liquidated")
    status = record["status"]
    if status == "operating":
        assert all(record[field] is None for field in ("soldAt", "liquidatedAt", "exitAmount", "finalReturn", "calculatedSettlementReturnPct", "delayDays"))
    elif status == "exit_in_progress":
        assert record["soldAt"] and record["liquidatedAt"] is None
        assert all(record[field] is None for field in ("exitAmount", "finalReturn", "calculatedSettlementReturnPct"))
    elif status in {"sold", "liquidated", "delayed", "loss_confirmed"}:
        assert record["exitAmount"] is not None and record["finalReturn"] is not None
        if record["liquidatedAt"]:
            assert record["soldAt"] and record["liquidatedAt"] >= record["soldAt"]
        if status == "delayed":
            assert record["delayDays"] > 0
        elif record["delayDays"] is not None:
            assert record["delayDays"] >= 0
    elif status == "returned":
        assert record["soldAt"] is None and record["liquidatedAt"] is None
        assert record["exitAmount"] is not None and record["finalReturn"] is not None
    if record["soldAt"]:
        assert record["soldAt"] >= record["subscriptionEnd"]
    if record["exitAmount"] is not None:
        expected = round(((record["exitAmount"] + (record["totalDistribution"] or 0)) / record["offeringAmount"] - 1) * 100, 2)
        assert record["finalReturn"] == expected
        assert record["calculatedSettlementReturnPct"] == expected
    assert record["sourceReportedReturnPct"] is None
    assert record["reportedReturn"] is None
    assert record["reportedAmount"] is None

source_distribution = Counter(item["sourceDataset"] for item in DATA["trackRecords"])
assert sum(source_distribution.values()) == len(DATA["trackRecords"])
assert len(source_distribution) >= 3 and all(count > 0 for count in source_distribution.values())
status_distribution = Counter(item["status"] for item in DATA["trackRecords"])
assert sum(status_distribution.values()) == len(DATA["trackRecords"])
assert {"operating", "exit_in_progress", "sold", "liquidated", "delayed", "returned"} <= set(status_distribution)
assert set(status_distribution) <= {"operating", "exit_in_progress", "sold", "liquidated", "delayed", "returned", "loss_confirmed"}
for artist_id, metrics in DATA["annualMetrics"].items():
    assert artist_id in artists
    assert metrics
    for metric in metrics:
        assert metric["offered"] == metric["sold"] + metric["unsold"]
        assert metric["offered"] >= metric["sold"] >= 0
        assert metric["medianPrice"] is None or metric["medianPrice"] > 0

for evidence in DATA["evidence"]:
    assert evidence["id"].startswith("synthetic-")
    assert evidence["sourceType"].startswith("synthetic_")
    assert evidence["sourceUrl"] is None
    if evidence["entityType"] == "Offering":
        assert evidence["entityId"] in offerings
    elif evidence["entityType"] == "Artist":
        assert evidence["entityId"] in artists
    elif evidence["entityType"] == "Platform":
        assert evidence["entityId"] in platforms
for analysis in DATA["analyses"]:
    assert analysis["offeringId"] in offerings
    assert set(analysis["evidenceIds"]) <= set(evidence_by_id)
for change in DATA["changeLogs"]:
    assert change["entityType"] == "Offering"
    assert change["entityId"] in offerings
    assert change["id"].startswith("synthetic-")
    assert change["changedAt"] == offerings[change["entityId"]]["updatedAt"]

print("PASS: synthetic data")
