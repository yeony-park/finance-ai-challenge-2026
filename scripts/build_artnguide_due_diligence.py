#!/usr/bin/env python3
"""Build the local-only Art n Guide due-diligence evidence artifact.

This builder deliberately treats the checked-in 187-row platform snapshot as
self-reported source data.  Artist URLs described in the two research lanes
are candidate links, not proof of identity, legal issuer, sale, or exact lot.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import tempfile
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
RAW_DATA = ROOT / "data/artnguide_track_records.json"
REGISTRY = ROOT / "data/artnguide_evidence_sources.json"
LANE_PATHS = (
    ROOT / "tmp/orca-ai-team/artnguide_artist_lane_a.md",
    ROOT / "tmp/orca-ai-team/artnguide_artist_lane_b.md",
)
OUTPUT = ROOT / "data/artnguide_due_diligence.json"
REPORT = ROOT / "deliverables/artnguide_due_diligence_evidence_2026-08-10.md"

RAW_ARTWORK_FIELDS = ("title", "yearItem", "artMaterial", "artSize")
RECORD_EVIDENCE_FIELDS = ("title", "authorName", "yearItem", "artMaterial", "artSize")
COMPLETED_STATUSES = {"TRANSFER", "RETURNED_PRODUCT"}
SOURCE_DATE = "2026-08-10T21:22:00+09:00"
LANE_A_EXACT_MATCH_CORRECTIONS = (
    {
        "artist": "게르하르트 리히터",
        "url": "https://www.christies.com/en/lot/lot-6236040",
        "source_label_as_reported": "Christie's separate lot candidate from lane A exact-match memo cell",
        "reported_by": "tmp/orca-ai-team/artnguide_artist_lane_a.md:21",
    },
)


class BuildError(RuntimeError):
    pass


def read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise BuildError(f"cannot read {path.relative_to(ROOT)}: {error}") from error


def slug(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]


def markdown_links(value: str) -> list[tuple[str, str]]:
    return re.findall(r"\[([^\]]+)\]\((https?://[^)]+)\)", value)


def lane_links(value: str) -> list[tuple[str | None, str]]:
    """Return both Markdown links and literal URLs from a lane cell."""
    links: list[tuple[str | None, str]] = list(markdown_links(value))
    known_urls = {url for _, url in links}
    for url in re.findall(r"(?<!\()https?://[^\s|)]+", value):
        url = url.rstrip(".,")
        if url not in known_urls:
            links.append((None, url))
            known_urls.add(url)
    return links


def source_date_from_lane(value: str) -> str | None:
    match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", value)
    return match.group(1) if match else None


def lane_candidate_sources(registry: dict) -> tuple[list[dict], dict[str, dict[str, list[str]]]]:
    """Extract lane URLs without claiming that their linked body was verified."""
    policy = registry["artist_candidate_source_policy"]
    sources: list[dict] = []
    by_artist: dict[str, dict[str, list[str]]] = defaultdict(
        lambda: {"identity": [], "same_artist_other_work": []}
    )
    seen_urls: set[tuple[str, str, str]] = set()

    for lane_path in LANE_PATHS:
        lane_id = f"artist-lane-{lane_path.stem.rsplit('_', 1)[-1]}"
        for line_no, line in enumerate(lane_path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.startswith("| ") or line.startswith("| 정규화") or line.startswith("|---"):
                continue
            cells = [cell.strip() for cell in line.split("|")]
            if len(cells) < 5:
                continue
            artist = cells[1]
            if lane_path.name.endswith("lane_a.md"):
                category_cells = (
                    ("identity", cells[2]),
                    ("same_artist_other_work", cells[4]),
                )
            else:
                category_cells = (
                    ("identity", cells[2]),
                    ("same_artist_other_work", cells[3]),
                )
            for category, cell in category_cells:
                for ordinal, (label, url) in enumerate(lane_links(cell), 1):
                    key = (artist, category, url)
                    if key in seen_urls:
                        continue
                    seen_urls.add(key)
                    source_id = f"artist-{slug(artist)}-{category}-{ordinal}-{slug(url)}"
                    source = {
                        "id": source_id,
                        "url": url,
                        "publisher": policy["publisher"],
                        "source_type": policy["source_type"],
                        "source_or_event_date": (
                            source_date_from_lane(cell)
                            if lane_path.name.endswith("lane_b.md")
                            else None
                        ),
                        "accessed_at": policy["accessed_at"],
                        "evidence_grade": policy["evidence_grade"],
                        "claim_scope": policy["claim_scope"],
                        "verification_status": policy["verification_status"],
                        "verification_reason": policy["verification_reason"],
                        "candidate_category": category,
                        "source_label_as_reported": label,
                        "reported_by": f"{lane_path.relative_to(ROOT)}:{line_no}",
                    }
                    sources.append(source)
                    by_artist[artist][category].append(source_id)

    # Lane A records this URL in the exact-match memo column.  The memo itself
    # says it is not an exact match, so retain the URL as an unverified
    # same-artist-other-work candidate instead of dropping it or promoting it.
    for correction in LANE_A_EXACT_MATCH_CORRECTIONS:
        artist = correction["artist"]
        category = "same_artist_other_work"
        url = correction["url"]
        key = (artist, category, url)
        if key in seen_urls:
            continue
        seen_urls.add(key)
        ordinal = len(by_artist[artist][category]) + 1
        source_id = f"artist-{slug(artist)}-{category}-{ordinal}-{slug(url)}"
        sources.append(
            {
                "id": source_id,
                "url": url,
                "publisher": policy["publisher"],
                "source_type": policy["source_type"],
                "source_or_event_date": policy["source_or_event_date"],
                "accessed_at": policy["accessed_at"],
                "evidence_grade": policy["evidence_grade"],
                "claim_scope": policy["claim_scope"],
                "verification_status": policy["verification_status"],
                "verification_reason": policy["verification_reason"],
                "candidate_category": category,
                "source_label_as_reported": correction["source_label_as_reported"],
                "reported_by": correction["reported_by"],
            }
        )
        by_artist[artist][category].append(source_id)
    return sources, dict(by_artist)


def is_complete_value(value: object) -> bool:
    return value is not None and not (isinstance(value, str) and value.strip() == "")


def inclusive_hold_days(record: dict) -> int | None:
    if record["status"] not in COMPLETED_STATUSES:
        return None
    if not record["startAt"] or not record["soldTime"]:
        return None
    start = datetime.fromisoformat(record["startAt"].replace("Z", "+00:00"))
    sold = datetime.fromisoformat(record["soldTime"].replace("Z", "+00:00"))
    return (sold - start).days + 1


def raw_name_groups(records: list[dict]) -> tuple[list[dict], list[dict], list[dict]]:
    raw_counts = Counter(record["authorName"] for record in records)
    grouped: dict[str, list[dict]] = defaultdict(list)
    for raw_name, count in raw_counts.items():
        grouped[raw_name.strip()].append({"raw_author_name": raw_name, "record_count": count})
    raw_names = [
        {"authorName": raw_name, "record_count": count}
        for raw_name, count in sorted(raw_counts.items())
    ]
    normalized = [
        {
            "whitespace_normalized_author_name": name,
            "raw_variants": sorted(variants, key=lambda item: item["raw_author_name"]),
            "record_count": sum(item["record_count"] for item in variants),
            "normalization": "python_str_strip_whitespace_only",
        }
        for name, variants in sorted(grouped.items())
    ]
    canonical_candidates = [
        {
            "raw_or_normalized_name": "최울가",
            "canonical_alias_candidate": "최 울 가",
            "status": "unverified_candidate",
            "reason": "lane B가 Gana Art CV의 공백 표기를 후보로 기록했으며 동일인 자동 병합을 금지함",
        },
        {
            "raw_or_normalized_name": "쟝 미셸 바스키아",
            "canonical_alias_candidate": "장-미셸 바스키아",
            "status": "unverified_candidate",
            "reason": "lane B가 두 입력 표기를 동일인으로 자동 확정하지 않도록 기록함",
        },
    ]
    return raw_names, normalized, canonical_candidates


def numeric_summary(values: list[int | float]) -> dict:
    """Return deterministic descriptive statistics without recomputing platform values."""
    ordered = sorted(values)
    count = len(ordered)
    if not count:
        return {"sample_count": 0, "mean": None, "median": None, "min": None, "max": None}
    midpoint = count // 2
    median = ordered[midpoint] if count % 2 else (ordered[midpoint - 1] + ordered[midpoint]) / 2
    return {
        "sample_count": count,
        "mean": sum(ordered) / count,
        "median": median,
        "min": ordered[0],
        "max": ordered[-1],
    }


def artist_aggregate_rows(
    records: list[dict], normalized_names: list[dict], identity_by_name: dict[str, dict]
) -> tuple[list[dict], dict]:
    """Aggregate only whitespace-normalized raw authorName values, never aliases."""
    records_by_artist: dict[str, list[dict]] = defaultdict(list)
    for record in records:
        records_by_artist[record["authorName"].strip()].append(record)

    rows = []
    for group in normalized_names:
        name = group["whitespace_normalized_author_name"]
        artist_records = records_by_artist[name]
        completed = [record for record in artist_records if record["status"] in COMPLETED_STATUSES]
        reported_profit = [record["profit"] for record in completed if record["profit"] is not None]
        reported_hold_days = [record["dateHold"] for record in completed if record["dateHold"] is not None]
        rows.append(
            {
                "whitespace_normalized_author_name": name,
                "classification": identity_by_name[name]["classification"],
                "raw_variants": group["raw_variants"],
                "record_count": len(artist_records),
                "status_counts": {
                    status: sum(record["status"] == status for record in artist_records)
                    for status in ("TRANSFER", "RETURNED_PRODUCT", "EXPECTED_TRANSFER")
                },
                "all_records_gpMoney_krw": sum(record["gpMoney"] for record in artist_records),
                "completed_soldMoney_krw": sum(record["soldMoney"] for record in completed),
                "platform_reported_profit_percent": {
                    **numeric_summary(reported_profit),
                    "denominator": "completed records with non-null platform raw profit",
                    "formula": "platform raw profit is summarized as reported; no soldMoney/gpMoney recalculation",
                    "source_id": "artnguide-track-records-snapshot",
                    "self_reported_limitation": "platform self-reported raw value; independently verified sale, fees, tax, and distribution are not established",
                },
                "platform_reported_dateHold_days": {
                    **numeric_summary(reported_hold_days),
                    "denominator": "completed records with non-null platform raw dateHold",
                    "formula": "platform raw dateHold is summarized as reported; the record-level inclusive-day check is not substituted",
                    "source_id": "artnguide-track-records-snapshot",
                    "self_reported_limitation": "platform self-reported raw value; start and sale event facts are not independently verified",
                },
                "exclusions": {
                    "EXPECTED_TRANSFER_soldMoney_zero": "excluded_from_completed_soldMoney_krw_not_a_sale_price",
                    "yearProfit": "excluded_from_artist_aggregate",
                },
            }
        )

    summary = {
        "row_count": len(rows),
        "record_count": sum(row["record_count"] for row in rows),
        "status_counts": {
            status: sum(row["status_counts"][status] for row in rows)
            for status in ("TRANSFER", "RETURNED_PRODUCT", "EXPECTED_TRANSFER")
        },
        "completed_record_count": sum(
            row["status_counts"]["TRANSFER"] + row["status_counts"]["RETURNED_PRODUCT"]
            for row in rows
        ),
        "all_records_gpMoney_krw": sum(row["all_records_gpMoney_krw"] for row in rows),
        "completed_soldMoney_krw": sum(row["completed_soldMoney_krw"] for row in rows),
        "platform_reported_profit_sample_count": sum(
            row["platform_reported_profit_percent"]["sample_count"] for row in rows
        ),
        "platform_reported_dateHold_sample_count": sum(
            row["platform_reported_dateHold_days"]["sample_count"] for row in rows
        ),
        "as_of": SOURCE_DATE,
        "source_id": "artnguide-track-records-snapshot",
        "scope": "whitespace-normalized raw authorName; canonical aliases are not merged",
    }
    return rows, summary


def build_payload() -> dict:
    raw = read_json(RAW_DATA)
    registry = read_json(REGISTRY)
    records = raw.get("records")
    annotations = raw.get("record_annotations")
    if not isinstance(records, list) or not isinstance(annotations, list):
        raise BuildError("raw snapshot must include records and record_annotations arrays")
    if len(records) != 187 or len(annotations) != 187:
        raise BuildError("raw snapshot must contain exactly 187 records and annotations")
    annotation_by_id = {item["id"]: item for item in annotations}
    if len(annotation_by_id) != 187:
        raise BuildError("record annotation IDs must be unique")

    candidate_sources, sources_by_artist = lane_candidate_sources(registry)
    sources = list(registry["source_documents"]) + [
        {
            "id": "artist-lane-a",
            "url": None,
            "publisher": "작업 분업 조사 메모",
            "source_type": "local_research_lane",
            "source_or_event_date": "2026-08-10 KST",
            "accessed_at": "2026-08-10 KST",
            "evidence_grade": "local_research_note",
            "claim_scope": "작가 identity 및 same-artist other-work URL 후보의 확인 수준",
            "verification_status": "verified_local_artifact",
            "local_artifact": str(LANE_PATHS[0].relative_to(ROOT)),
        },
        {
            "id": "artist-lane-b",
            "url": None,
            "publisher": "작업 분업 조사 메모",
            "source_type": "local_research_lane",
            "source_or_event_date": "2026-08-10 KST",
            "accessed_at": "2026-08-10 KST",
            "evidence_grade": "local_research_note",
            "claim_scope": "작가 identity 및 same-artist other-work URL 후보의 확인 수준",
            "verification_status": "verified_local_artifact",
            "local_artifact": str(LANE_PATHS[1].relative_to(ROOT)),
        },
    ] + candidate_sources
    source_ids = [source["id"] for source in sources]
    if len(source_ids) != len(set(source_ids)):
        raise BuildError("source IDs must be unique")

    raw_names, normalized_names, canonical_candidates = raw_name_groups(records)
    if len(raw_names) != 48 or len(normalized_names) != 45:
        raise BuildError("expected 48 raw and 45 whitespace-normalized author names")

    identities = []
    for group in normalized_names:
        name = group["whitespace_normalized_author_name"]
        if name == "공부차":
            identities.append(
                {
                    "whitespace_normalized_author_name": name,
                    "classification": "non_artist_candidate",
                    "identity_completeness": "unverified",
                    "source_ids": [],
                    "reason": "lane A가 차 상품명 또는 브랜드일 가능성을 기록했고 작가로 가정하지 않음",
                }
            )
            continue
        identities.append(
            {
                "whitespace_normalized_author_name": name,
                "classification": "artist_name_candidate",
                "identity_completeness": "unverified",
                "source_ids": sources_by_artist.get(name, {}).get("identity", []),
                "reason": "lane의 URL·요약은 저장돼 있으나 외부 본문과 대상 identity를 직접 검증한 증거를 이 산출물에 보관하지 않음",
            }
        )
    identity_by_name = {item["whitespace_normalized_author_name"]: item for item in identities}
    artist_aggregates, artist_aggregate_summary = artist_aggregate_rows(
        records, normalized_names, identity_by_name
    )

    artist_track_records = []
    record_evidence = []
    legal_issuer_mapping = []
    field_complete_counts = Counter()
    for record in records:
        record_id = record["id"]
        annotation = annotation_by_id[record_id]
        normalized_name = record["authorName"].strip()
        same_artist_source_ids = sources_by_artist.get(normalized_name, {}).get(
            "same_artist_other_work", []
        )
        completeness = {
            field: "complete" if is_complete_value(record[field]) else "확인 불가"
            for field in RAW_ARTWORK_FIELDS
        }
        field_complete_counts.update(
            field for field, state in completeness.items() if state == "complete"
        )
        completed = record["status"] in COMPLETED_STATUSES
        recomputed_hold = inclusive_hold_days(record)
        artist_track_records.append(
            {
                "id": record_id,
                "data_character": "platform_self_reported_raw",
                "platform_raw": {
                    "status": record["status"],
                    "gpMoney": record["gpMoney"],
                    "soldMoney": record["soldMoney"],
                    "profit": record["profit"],
                    "dateHold": record["dateHold"],
                    "yearProfit": record["yearProfit"],
                },
                "source": {
                    "source_id": "artnguide-track-records-snapshot",
                    "platform_page_source_id": "artnguide-purchase-summary-page",
                    "platform_page_url": annotation["page_api_url"],
                    "record_sequence": annotation["sequence"],
                    "page": annotation["page"],
                },
                "derived_for_local_coverage_only": {
                    "completed_status": completed,
                    "soldMoney_aggregate_included": completed,
                    "soldMoney_treatment": (
                        "completed_status_raw_value_included"
                        if completed
                        else "EXPECTED_TRANSFER_soldMoney_0_is_not_sale_price_and_is_excluded"
                    ),
                    "gpMoney_denominator_krw": record["gpMoney"] if completed else None,
                    "reported_profit_percent": record["profit"],
                    "reported_profit_formula": None,
                    "reported_profit_calculation_note": "platform API raw value; not independently recalculated from soldMoney/gpMoney",
                    "dateHold_raw_days": record["dateHold"],
                    "dateHold_recomputed_inclusive_days": recomputed_hold,
                    "dateHold_formula": (
                        "floor((soldTime - startAt) / 86400000) + 1"
                        if completed
                        else None
                    ),
                    "yearProfit_raw_percent": record["yearProfit"],
                    "yearProfit_ui_judgment_excluded": True,
                    "yearProfit_aggregate_excluded": True,
                },
                "limitations": [
                    "legal issuer history is not established by this record",
                    "this is not an independently verified auction or sale record",
                ],
            }
        )
        record_evidence.append(
            {
                "id": record_id,
                "platform_record_fields": {field: record[field] for field in RECORD_EVIDENCE_FIELDS},
                "platform_page_source": {
                    "source_id": "artnguide-track-records-snapshot",
                    "page_url": annotation["page_api_url"],
                    "page": annotation["page"],
                    "sequence": annotation["sequence"],
                },
                "identity": {
                    "raw_authorName": record["authorName"],
                    "whitespace_normalized_authorName": normalized_name,
                    "classification": identity_by_name[normalized_name]["classification"],
                    "completeness": identity_by_name[normalized_name]["identity_completeness"],
                    "source_ids": identity_by_name[normalized_name]["source_ids"],
                },
                "external_exact_match": {
                    "status": "not_found_in_provided_evidence",
                    "source_ids": [],
                    "reason": "provided artist lanes report no title·year·material·size exact match; no external result is promoted from a URL alone",
                },
                "same_artist_other_work": {
                    "status": (
                        "candidate_sources_unverified" if same_artist_source_ids else "확인 불가"
                    ),
                    "source_ids": same_artist_source_ids,
                    "reason": "same-artist other-work candidates are separated from exact-match evidence and do not support price adequacy or prediction",
                },
            }
        )
        legal_issuer_mapping.append(
            {
                "id": record_id,
                "legal_issuer": registry["legal_issuer_mapping_policy"]["record_level_default"],
                "verification_status": registry["legal_issuer_mapping_policy"]["verification_status"],
                "source_ids": [],
                "reason": registry["legal_issuer_mapping_policy"]["reason"],
            }
        )

    official = raw["official_stats"]
    official_raw = official["raw"]
    raw_sha = hashlib.sha256(RAW_DATA.read_bytes()).hexdigest()
    lane_hashes = {
        str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in LANE_PATHS
    }
    candidate_same_artist_records = sum(
        1 for item in record_evidence if item["same_artist_other_work"]["source_ids"]
    )
    completed = [record for record in records if record["status"] in COMPLETED_STATUSES]
    payload = {
        "schema_version": "1.0.0",
        "dataset": {
            "id": "artnguide-local-due-diligence-evidence-2026-08-10",
            "as_of": SOURCE_DATE,
            "mode": "local_due_diligence_artifact_only",
            "connection_status": "not_connected_to_frontend_api_or_live",
            "input_artifacts": {
                "raw_track_records": str(RAW_DATA.relative_to(ROOT)),
                "raw_track_records_sha256": raw_sha,
                "source_registry": str(REGISTRY.relative_to(ROOT)),
                "artist_lane_sha256": lane_hashes,
            },
        },
        "source_registry": {
            "fields": [
                "url",
                "publisher",
                "source_type",
                "source_or_event_date",
                "accessed_at",
                "evidence_grade",
                "claim_scope",
                "verification_status",
            ],
            "sources": sources,
        },
        "operator_evidence": {
            "operator_name": "주식회사 열매컴퍼니",
            "operator_claim_source_ids": [
                "artnguide-terms-id-12",
                "fss-press-release-2023-12-15",
                "dart-company-information-01645448",
            ],
            "operator_claim_verification_status": "unverified",
            "record_level_legal_issuer_mapping_status": "unverified",
            "record_level_legal_issuer_mapping_reason": registry["legal_issuer_mapping_policy"]["reason"],
            "record_legal_issuer_mapping": legal_issuer_mapping,
            "independent_sale_or_auction_verification_status": "not_performed",
        },
        "author_name_evidence": {
            "raw_authorName_values": raw_names,
            "raw_authorName_distinct_count": len(raw_names),
            "whitespace_normalized_values": normalized_names,
            "whitespace_normalized_distinct_count": len(normalized_names),
            "canonical_alias_candidates": canonical_candidates,
            "non_artist_candidates": [
                {
                    "raw_or_normalized_name": "공부차",
                    "classification": "non_artist_candidate",
                    "reason": "차 상품명 또는 브랜드 가능성을 배제하지 못해 작가로 가정하지 않음",
                }
            ],
            "artist_identity_evidence": identities,
        },
        "artist_aggregates": {
            "as_of": SOURCE_DATE,
            "source_id": "artnguide-track-records-snapshot",
            "normalization": "python_str_strip_whitespace_only; canonical alias candidates are not merged",
            "money_unit": "KRW",
            "profit_unit": "percent",
            "dateHold_unit": "days",
            "all_records_gpMoney_formula": "sum(raw gpMoney for every status)",
            "completed_soldMoney_formula": "sum(raw soldMoney where status in TRANSFER, RETURNED_PRODUCT)",
            "profit_and_dateHold_formula": "descriptive statistics over completed records with non-null platform raw values",
            "yearProfit_policy": "excluded_from_artist_aggregate",
            "self_reported_limitation": "all amounts, profit, and dateHold are platform self-reported raw values; this artifact does not independently verify sales, fees, tax, distributions, or identity",
            "rows": artist_aggregates,
            "summary": artist_aggregate_summary,
        },
        "artist_track_records": artist_track_records,
        "record_evidence": record_evidence,
        "coverage": {
            "platform_raw_record_count": len(records),
            "artist_track_record_count": len(artist_track_records),
            "record_evidence_count": len(record_evidence),
            "legal_issuer_mapping_count": len(legal_issuer_mapping),
            "platform_artwork_field_complete_counts": {
                field: field_complete_counts[field] for field in RAW_ARTWORK_FIELDS
            },
            "identity_confirmed_record_count": 0,
            "identity_unverified_record_count": len(records),
            "external_exact_match_record_count": 0,
            "same_artist_other_work_candidate_record_count": candidate_same_artist_records,
            "same_artist_other_work_unverified_reason": "candidate URL 또는 lane 요약만 있으며 target title·year·material·size 외부 원문 대조 증거가 없음",
        },
        "aggregate_context": {
            "platform_official_stats": official,
            "platform_list_record_count": len(records),
            "official_minus_list_record_count": official_raw["totalGp"] - len(records),
            "allocation_of_official_list_difference": "not_attempted",
            "completed_statuses": sorted(COMPLETED_STATUSES),
            "completed_record_count": len(completed),
            "EXPECTED_TRANSFER_soldMoney_zero_policy": "not_a_sale_price_excluded_from_completed_soldMoney_aggregate",
            "yearProfit_policy": "preserved_raw_but_excluded_from_ui_judgment_and_aggregate",
        },
        "limitations": [
            "플랫폼 자체 게시값은 법적 발행사 이력이나 독립 경매·매각 이력으로 표기하지 않음",
            "외부 exact match와 same-artist other-work를 분리하며 가격 적정성·예측·투자판단을 생성하지 않음",
            "외부 URL, 검색 URL, generic homepage 또는 lane 요약만으로 identity를 confirmed 처리하지 않음",
        ],
    }
    return payload


def render_report(payload: dict) -> str:
    coverage = payload["coverage"]
    aggregate = payload["aggregate_context"]
    artist_aggregates = payload["artist_aggregates"]
    rows = artist_aggregates["rows"]
    report = [
            "# 아트앤가이드 통합 실사 evidence dataset",
            "",
            "기준일 : 2026-08-10 21:22 KST. 이 문서는 로컬 실사용 artifact이며 frontend, `/api`, `/live`에 연결하지 않는다.",
            "",
            "## 출처·확인 상태",
            "",
            f"- source registry : {len(payload['source_registry']['sources'])}건. URL만 있는 artist 후보 링크는 `candidate_link_from_research_lane`·`unverified`로 유지했다.",
            "- 플랫폼 187건은 아트앤가이드·열매컴퍼니의 self-reported raw snapshot이다. 법적 발행인, 독립 매각·경매, 실제 분배 이력은 이 저장본으로 확인하지 않는다.",
            "- 운영사 관련 약관·금감원·DART URL은 lane에 기록된 주장 범위만 보존했다. 외부 본문 저장본이 없으므로 이 artifact에서 `unverified`다.",
            "",
            "## 187개 record 결합",
            "",
            f"- `artist_track_records` : {coverage['artist_track_record_count']}건. status, gpMoney, soldMoney, reported profit, dateHold를 raw 값·출처·분모·계산식과 분리해 기록했다.",
            f"- `record_evidence` : {coverage['record_evidence_count']}건. 각 id에 raw JSON의 title/yearItem/artMaterial/artSize를 직접 결합했다. 필드 complete 수는 title {coverage['platform_artwork_field_complete_counts']['title']}건, yearItem {coverage['platform_artwork_field_complete_counts']['yearItem']}건, artMaterial {coverage['platform_artwork_field_complete_counts']['artMaterial']}건, artSize {coverage['platform_artwork_field_complete_counts']['artSize']}건이다.",
            f"- external exact match : {coverage['external_exact_match_record_count']}건. same-artist other-work candidate는 {coverage['same_artist_other_work_candidate_record_count']}건이며 모두 unverified다.",
            "",
            "## 이름·발행사 한계",
            "",
            f"- raw `authorName`은 {payload['author_name_evidence']['raw_authorName_distinct_count']}개 원값을 보존했고, `strip()` whitespace-only 결과는 {payload['author_name_evidence']['whitespace_normalized_distinct_count']}개다. canonical alias 후보는 별도이며 자동 병합하지 않았다.",
            "- `공부차`는 `non_artist_candidate`로 분류했다.",
            f"- 레코드별 legal issuer mapping {coverage['legal_issuer_mapping_count']}건은 모두 null/unverified다.",
            "",
            "## 집계 규칙",
            "",
            f"- 공식 상단 {aggregate['platform_official_stats']['raw']['totalGp']}건과 목록 {aggregate['platform_list_record_count']}건의 차이 {aggregate['official_minus_list_record_count']}건은 어떤 record에도 배분하지 않았다.",
            "- `EXPECTED_TRANSFER`의 `soldMoney : 0`은 매각가 0원이 아니며 완료 매각가 집계에서 제외했다. `yearProfit`은 raw 값을 보존했지만 UI 판단·aggregate에서 제외했다.",
            "- 외부 comparable로 가격 적정성·예측을 만들지 않았다.",
            "",
            "## whitespace-normalized 작가별 aggregate 45행",
            "",
            "기준일 : 2026-08-10 21:22 KST. 금액 단위는 KRW, 수익률 단위는 %, 보유기간 단위는 일(day)이며 모든 값의 source id는 `artnguide-track-records-snapshot`이다.",
            "",
            "계산식 : `all gpMoney = 모든 status의 raw gpMoney 합계`; `completed soldMoney = TRANSFER + RETURNED_PRODUCT의 raw soldMoney 합계`; profit·dateHold는 완료 150건 중 해당 raw 값이 null이 아닌 표본의 mean/median/min/max이다. `EXPECTED_TRANSFER`의 soldMoney 0과 모든 `yearProfit`은 aggregate에서 제외한다.",
            "",
            "한계 : 아래 금액·수익률·보유기간은 플랫폼 self-reported raw value이며, 독립 매각, 수수료, 세금, 분배, 작가 identity를 확인한 값이 아니다.",
            "",
            "| 작가명 | raw variants | record | T/R/E | all gpMoney | completed soldMoney | profit n/mean/median/min/max | dateHold n/mean/median/min/max |",
            "|---|---|---:|---:|---:|---:|---|---|",
        ]
    for row in rows:
        profit = row["platform_reported_profit_percent"]
        hold = row["platform_reported_dateHold_days"]
        variants = ", ".join(item["raw_author_name"] for item in row["raw_variants"])
        status = row["status_counts"]
        report.append(
            "| {name} | {variants} | {records} | {transfer}/{returned}/{expected} | {gp} | {sold} | {profit_n}/{profit_mean}/{profit_median}/{profit_min}/{profit_max} | {hold_n}/{hold_mean}/{hold_median}/{hold_min}/{hold_max} |".format(
                name=row["whitespace_normalized_author_name"],
                variants=variants,
                records=row["record_count"],
                transfer=status["TRANSFER"],
                returned=status["RETURNED_PRODUCT"],
                expected=status["EXPECTED_TRANSFER"],
                gp=row["all_records_gpMoney_krw"],
                sold=row["completed_soldMoney_krw"],
                profit_n=profit["sample_count"],
                profit_mean=profit["mean"],
                profit_median=profit["median"],
                profit_min=profit["min"],
                profit_max=profit["max"],
                hold_n=hold["sample_count"],
                hold_mean=hold["mean"],
                hold_median=hold["median"],
                hold_min=hold["min"],
                hold_max=hold["max"],
            )
        )
    return "\n".join(report) + "\n"


def json_text(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"


def materialized_registry_text(candidate_sources: list[dict]) -> str:
    """Keep every lane URL in the checked-in source registry, not only a policy."""
    registry = read_json(REGISTRY)
    registry["artist_candidate_sources"] = candidate_sources
    return json.dumps(registry, ensure_ascii=False, indent=2) + "\n"


def atomic_write(path: Path, content: str) -> None:
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(content)
        temporary = Path(handle.name)
    temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if checked-in outputs differ")
    args = parser.parse_args()
    payload = build_payload()
    expected_json = json_text(payload)
    expected_report = render_report(payload)
    expected_registry = materialized_registry_text(
        [
            source
            for source in payload["source_registry"]["sources"]
            if source.get("candidate_category")
        ]
    )
    if args.check:
        mismatches = [
            str(path.relative_to(ROOT))
            for path, expected in (
                (REGISTRY, expected_registry),
                (OUTPUT, expected_json),
                (REPORT, expected_report),
            )
            if not path.exists() or path.read_text(encoding="utf-8") != expected
        ]
        if mismatches:
            raise SystemExit("OUT OF DATE: " + ", ".join(mismatches))
        print("PASS: artnguide due-diligence artifacts are deterministic")
        return 0
    atomic_write(REGISTRY, expected_registry)
    atomic_write(OUTPUT, expected_json)
    atomic_write(REPORT, expected_report)
    print(f"WROTE: {OUTPUT.relative_to(ROOT)}")
    print(f"WROTE: {REPORT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
