#!/usr/bin/env python3
"""Deterministic validation for the checked-in art-only catalog."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
products = json.loads((ROOT / "data/products.json").read_text(encoding="utf-8"))["products"]
issuers = json.loads((ROOT / "data/issuers.json").read_text(encoding="utf-8"))["issuers"]
assert len(products) == 5
assert {product["id"] for product in products} == {"at-kim-whanki-009-01", "at-chonghyun-009-02", "at-youngkuk-008", "at-kusama-001", "at-condo-002"}
assert all(product["category"] == "미술품" for product in products)
assert all(product["issuer"] == "투게더아트" for product in products)
assert [issuer["id"] for issuer in issuers] == ["togetherart"]
assert not any("property_configs" in path.name for path in (ROOT / "data").iterdir())
assert not (ROOT / "data/source_snapshots.json").exists()
print("PASS: art-only data")
