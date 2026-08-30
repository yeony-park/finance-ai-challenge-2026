"""Deterministic local smoke for the checked-in synthetic fixture; no external API calls."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import server

fixture = json.loads((ROOT / "data/synthetic/art-investment.json").read_text(encoding="utf-8"))
catalog = server.catalog()
assert catalog["synthetic"] is True
assert len(catalog["offerings"]) == len(fixture["offerings"]) == 9
assert len(catalog["trackRecords"]) == len(fixture["trackRecords"]) == 318
history = server.synthetic_history()
assert history["synthetic"] is True
assert len(history["history"]) == len(fixture["trackRecords"])
assert all(item["id"].startswith("synthetic-") for item in fixture["offerings"] + fixture["trackRecords"])
print("PASS: local synthetic fixture")
