"""Deterministic local smoke for checked-in art snapshots; no external API calls."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server

catalog = server.catalog()
assert len(catalog["products"]) == 5
assert all(product["category"] == "미술품" for product in catalog["products"])
assert len(server.read_fixed_json(server.ARTNGUIDE_TRACK_RECORDS_PATH)["records"]) == 187
assert len(server.read_fixed_json(server.WESHAREART_RESEARCH_PATH)["track_records"]["records"]) == 145
assert len(server.read_fixed_json(server.TESSA_SALE_RECORDS_PATH)["records"]) == 6
print("PASS: local art snapshots")
