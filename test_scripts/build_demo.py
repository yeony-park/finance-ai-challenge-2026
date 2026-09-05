#!/usr/bin/env python3
"""더미 상품과 최근 스모크 테스트 상태를 정적 웹 데모용 JSON으로 만든다."""

from __future__ import annotations

import argparse
import json
import math
import shutil
from datetime import date, datetime, timezone
from pathlib import Path
from statistics import median
from typing import Any


ROOT = Path(__file__).resolve().parent
FIXTURE_FILE = ROOT / "fixtures" / "dummy_products.json"
OUTPUT_ROOT = ROOT / "output"
NORMALIZED_FILE = OUTPUT_ROOT / "normalized" / "latest.json"
DEMO_DIR = OUTPUT_ROOT / "demo_site"
DEMO_FILE = DEMO_DIR / "demo_payload.json"
WEB_SOURCE = ROOT / "web" / "index.html"

SOURCE_INFO = (
    ("opendart", "OpenDART", "공모·발행 관련 공식 공시와 위험요인 확인"),
    ("legal_dong", "법정동코드", "주소를 실거래·건축물 조회용 지역코드로 연결"),
    ("rtms", "상업·업무용 실거래가", "같은 지역의 실제 신고 거래와 가격 대조"),
    ("building_hub", "건축HUB", "용도·면적·구조·사용승인일 등 건물 동일성 대조"),
    ("rone", "R-ONE", "지역별 공실률·임대료 등 시장 환경 보강"),
    ("ecos", "ECOS", "금리 등 거시환경 보강"),
)

STATUS_LABELS = {
    "matched": "일치",
    "comparison_candidate": "비교 후보",
    "context": "맥락",
    "held": "보류",
}


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as file:
        value = json.load(file)
    if not isinstance(value, dict):
        raise ValueError(f"JSON 최상위 값은 객체여야 합니다: {path}")
    return value


def normalized_sources() -> dict[str, dict[str, Any]]:
    if not NORMALIZED_FILE.exists():
        return {}
    normalized = load_json(NORMALIZED_FILE)
    sources = normalized.get("sources")
    if not isinstance(sources, list):
        raise ValueError("정규화 결과의 sources 형식이 올바르지 않습니다.")
    return {
        source["source"]: source
        for source in sources
        if isinstance(source, dict) and isinstance(source.get("source"), str)
    }


def records(source: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not source or source.get("status") != "ok" or not isinstance(source.get("records"), list):
        return []
    return [record for record in source["records"] if isinstance(record, dict)]


def record_reference(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "subject_id": record.get("subject_id"),
        "as_of": record.get("as_of"),
        "record_type": record.get("record_type"),
        "data": record.get("data"),
    }


def has_comparison_area(record: dict[str, Any], comparison_area_m2: float) -> bool:
    value = record.get("data", {}).get("building_area_m2")
    try:
        return float(value) == comparison_area_m2
    except (TypeError, ValueError):
        return False


def source_link(
    source: str,
    label: str,
    role: str,
    normalized: dict[str, Any] | None,
    status: str,
    basis: str,
    limitations: str,
    matched_record: dict[str, Any] | None = None,
    candidates: list[dict[str, Any]] | None = None,
    excluded_records: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    result = {
        "id": source,
        "label": label,
        "role": role,
        "status": status,
        "status_label": STATUS_LABELS[status],
        "source_url": normalized.get("source_url") if normalized else None,
        "subject_id": matched_record.get("subject_id") if matched_record else None,
        "as_of": matched_record.get("as_of") if matched_record else None,
        "fetched_at": normalized.get("fetched_at") if normalized else None,
        "basis": basis,
        "limitations": limitations,
    }
    if matched_record:
        result["record"] = record_reference(matched_record)
    if candidates is not None:
        result["candidates"] = [record_reference(record) for record in candidates]
    if excluded_records is not None:
        result["excluded_records"] = [record_reference(record) for record in excluded_records]
    return result


def connection_results(product: dict[str, Any]) -> list[dict[str, Any]]:
    criteria = product.get("connection_criteria")
    if not isinstance(criteria, dict):
        raise ValueError("현재 더미 상품에 connection_criteria가 필요합니다.")
    normalized = normalized_sources()
    source_info = {source: (label, role) for source, label, role in SOURCE_INFO}

    legal = normalized.get("legal_dong")
    legal_record = next(
        (
            record
            for record in records(legal)
            if record.get("subject_id") == criteria["legal_dong_code"]
            and record.get("data", {}).get("lowest_region_name") == criteria["legal_dong_name"]
        ),
        None,
    )

    rtms = normalized.get("rtms")
    matching_rtms = [
        record
        for record in records(rtms)
        if record.get("data", {}).get("region_code") == criteria["sigungu_code"]
        and record.get("data", {}).get("legal_dong_name") == criteria["legal_dong_name"]
        and record.get("data", {}).get("building_use") == criteria["building_use"]
        and has_comparison_area(record, criteria["comparison_area_m2"])
    ]
    rtms_candidates = [record for record in matching_rtms if not record.get("data", {}).get("cancellation_date")]
    cancelled_rtms = [record for record in matching_rtms if record.get("data", {}).get("cancellation_date")]

    ecos = normalized.get("ecos")
    rate_records = [
        record
        for record in records(ecos)
        if record.get("data", {}).get("item_name") == "한국은행 기준금리"
    ]
    rate_record = max(rate_records, key=lambda record: record.get("as_of") or "", default=None)

    results = [
        source_link(
            "legal_dong", *source_info["legal_dong"], legal,
            "matched" if legal_record else "held",
            "법정동코드·법정동명이 더미 상품의 연결 기준과 정확히 일치합니다."
            if legal_record else "정규화 결과에서 더미 상품의 법정동코드를 찾지 못했습니다.",
            "법정동 일치는 건물 또는 실제 상품의 동일성을 확인하지 않습니다.",
            legal_record,
        ),
        source_link(
            "rtms", *source_info["rtms"], rtms,
            "comparison_candidate" if rtms_candidates else "held",
            "시군구·법정동·건물용도·비교면적이 같은 취소되지 않은 신고 거래만 비교 후보로 남겼습니다."
            if rtms_candidates else "연결 기준을 모두 만족하고 취소되지 않은 거래를 찾지 못했습니다.",
            "비교 후보는 같은 건물 또는 상품의 거래라는 뜻이 아닙니다. 금액 단위가 정규화 결과에서 미확정이므로 변환·합산하지 않습니다.",
            rtms_candidates[0] if len(rtms_candidates) == 1 else None,
            rtms_candidates,
            cancelled_rtms,
        ),
        source_link(
            "ecos", *source_info["ecos"], ecos,
            "context" if rate_record else "held",
            "한국은행 기준금리를 부동산 상품의 가격·동일성 판단과 분리된 거시 맥락으로만 표시합니다."
            if rate_record else "정규화 결과에서 한국은행 기준금리 레코드를 찾지 못했습니다.",
            "기준금리는 상품 공시·기초자산·수익 또는 비교거래의 사실 일치를 증명하지 않습니다.",
            rate_record,
        ),
        source_link(
            "opendart", *source_info["opendart"], normalized.get("opendart"),
            "held",
            "더미 상품에는 실제 공시 식별자나 문서 URL이 없어 OpenDART 레코드와 연결하지 않았습니다.",
            "API 응답의 공시 목록은 더미 상품 관련 공시 또는 상품 사실의 일치를 뜻하지 않습니다.",
        ),
        source_link(
            "building_hub", *source_info["building_hub"], normalized.get("building_hub"),
            "held",
            "현재 건축HUB 조회 조건의 법정동 코드가 10100이며, 정규화 레코드 주소도 청운동입니다.",
            "더미 상품 기준은 창신동이므로 건물 동일성을 판정하지 않습니다. 창신동 대상의 건축물대장 조회와 건물 식별자가 필요합니다.",
        ),
        source_link(
            "rone", *source_info["rone"], normalized.get("rone"),
            "held",
            "현재 정규화 결과의 표는 상업용 공실률·임대료 표가 아니므로 사용을 보류합니다.",
            "상업용 공실률·임대료에 맞는 표·지역·기준일을 확인하기 전에는 시장 근거로 사용하지 않습니다.",
        ),
    ]
    return results


def review_steps(links: list[dict[str, Any]]) -> list[dict[str, str]]:
    link_by_id = {link["id"]: link for link in links}
    rtms = link_by_id["rtms"]
    return [
        {
            "title": "상품 입력",
            "status": "sample",
            "detail": "실제 STO가 아닌 가상 상품 조건으로 연결 규칙을 검증 중입니다.",
        },
        {
            "title": "법정동 연결",
            "status": link_by_id["legal_dong"]["status"],
            "detail": "법정동코드 1111017400과 창신동 조건이 정규화 법정동코드 레코드와 일치합니다.",
        },
        {
            "title": "실거래 1차 후보 검색",
            "status": rtms["status"],
            "detail": (
                f"연결 기준을 만족하는 취소되지 않은 비교 후보 {len(rtms.get('candidates', []))}건을 발견하고, "
                f"취소 거래 {len(rtms.get('excluded_records', []))}건을 제외했습니다. 거래금액 단위·건물 동일성·비교 가능성이 미확인되어 가격 판정은 보류합니다."
            ),
        },
        {
            "title": "금리 맥락 연결",
            "status": link_by_id["ecos"]["status"],
            "detail": "한국은행 기준금리는 가격·동일성 판단과 분리된 거시 맥락으로만 연결합니다.",
        },
        {
            "title": "공시 사실 구조화",
            "status": link_by_id["opendart"]["status"],
            "detail": "실제 공시 식별자와 문서 URL이 없어 OpenDART 공시 연결을 보류합니다.",
        },
        {
            "title": "건물 동일성 대조",
            "status": link_by_id["building_hub"]["status"],
            "detail": "현재 건축HUB 조회 범위가 청운동이므로 창신동 가상 상품의 건물 동일성 판정을 보류합니다.",
        },
        {
            "title": "상업용 시장 근거",
            "status": link_by_id["rone"]["status"],
            "detail": "현재 R-ONE 표가 상업용 공실률·임대료 표가 아니므로 시장 근거 사용을 보류합니다.",
        },
    ]


def evidence_review_for_api_example(product: dict[str, Any], links: list[dict[str, Any]]) -> dict[str, Any]:
    review = dict(product["evidence_review"])
    items = [dict(item) for item in review["items"]]
    rtms = next((link for link in links if link.get("id") == "rtms"), None)
    candidates = rtms.get("candidates", []) if isinstance(rtms, dict) else []
    has_candidate = isinstance(rtms, dict) and rtms.get("status") == "comparison_candidate" and bool(candidates)

    if has_candidate:
        review["comparison_search_status"] = f"1차 비교 후보 {len(candidates)}건"
        review["price_review_reason"] = "거래금액 단위, 건물 동일성, 비교 가능성이 미확인되어 가격 판단을 보류합니다."
        items[0].update(
            {
                "status": "연결 규칙 검증",
                "record_is_sample": False,
                "linkage_is_sample": True,
                "applicability_status": "미검증",
            }
        )
    elif isinstance(rtms, dict) and rtms.get("status") == "held":
        review["comparison_search_status"] = "연결 보류"
        review["price_review_reason"] = "RTMS 연결이 보류되어 비교 후보, 거래금액 단위, 건물 동일성 및 비교 가능성을 확인하지 못했습니다."
        items[0].update(
            {
                "status": "연결 보류",
                "record_is_sample": None,
                "linkage_is_sample": True,
                "applicability_status": "미검증",
            }
        )
    else:
        review["comparison_search_status"] = "1차 비교 후보 없음"
        review["price_review_reason"] = "현재 RTMS 연결 결과에서 비교 후보를 확인하지 못해 가격 판단을 보류합니다."
        items[0].update(
            {
                "status": "연결 보류",
                "record_is_sample": None,
                "linkage_is_sample": True,
                "applicability_status": "미검증",
            }
        )

    review["price_review"] = "판정 보류"
    review["items"] = items
    return review


def comparison_method() -> dict[str, Any]:
    return {
        "sample": True,
        "source_status": "demo_scenario",
        "status": "검증 전 샘플 규칙",
        "rules": {
            "same_region_and_use": "같은 지역·용도",
            "area_tolerance": "면적 차이 ±20%",
            "recency": "최근 24개월",
            "exclude_cancelled_transactions": "취소 거래 제외",
            "minimum_candidate_count": 3,
            "classification": "비교가격 중앙값 대비 ±10% 이내=유사 거래 범위 내, +10% 초과=높음, -10% 미만=낮음",
        },
        "limitations": "모든 규칙과 임계값은 실제 데이터 검증 전 샘플이며 투자 적정성 기준이 아닙니다.",
    }


def offering_breakdown(product: dict[str, Any]) -> dict[str, Any]:
    offering = product["offering"]
    difference = offering["offering_amount_krw"] - offering["building_purchase_price_krw"]
    return {
        "offering_amount_krw": offering["offering_amount_krw"],
        "building_purchase_price_krw": offering["building_purchase_price_krw"],
        "difference_krw": difference,
        "difference_rate_pct": round(difference / offering["building_purchase_price_krw"] * 100, 2),
        "description": "차액은 취득비용·수수료·예비비 등의 가상 묶음이며 실제 세부 명세가 아닙니다.",
        "sample": True,
    }


def api_comparison_result(links: list[dict[str, Any]]) -> dict[str, Any]:
    rtms = next((link for link in links if link.get("id") == "rtms"), None)
    candidates = rtms.get("candidates", []) if isinstance(rtms, dict) else []
    candidate_count = len(candidates) if isinstance(candidates, list) else 0
    active = isinstance(rtms, dict) and rtms.get("status") == "comparison_candidate" and candidate_count > 0
    return {
        "status": "held",
        "classification": "판정 보류",
        "candidate_count": candidate_count if active else 0,
        "target_price_per_m2_krw": None,
        "median_price_per_m2_krw": None,
        "deviation_pct": None,
        "sample": True,
        "source_status": "normalized_public_api" if active else "connection_held",
        "reason": "RTMS 금액 단위, 건물 동일성, 비교 가능성이 미확인되어 중앙값과 편차율을 계산하지 않습니다."
        if active else "RTMS 연결 결과에서 검증 가능한 비교 후보가 없어 가격 판단을 보류합니다.",
    }


def is_positive_number(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and value > 0
    )


def two_calendar_years_before(value: date) -> date:
    try:
        return value.replace(year=value.year - 2)
    except ValueError:
        return value.replace(year=value.year - 2, day=28)


def is_valid_scenario_candidate(product: dict[str, Any], transaction: dict[str, Any]) -> bool:
    if transaction.get("sample") is not True or transaction.get("source_status") != "demo_scenario":
        return False
    if transaction.get("cancellation_date"):
        return False
    basic_info = product["basic_info"]
    if transaction.get("region") != basic_info["region"] or transaction.get("building_use") != basic_info["building_use"]:
        return False
    target_area = basic_info.get("gross_floor_area_m2")
    transaction_area = transaction.get("gross_floor_area_m2")
    if not is_positive_number(target_area) or not is_positive_number(transaction_area):
        return False
    if abs(transaction_area / target_area - 1) > 0.2:
        return False
    if not is_positive_number(transaction.get("sale_amount_krw")):
        return False
    try:
        comparison_as_of = date.fromisoformat(product["comparison_as_of"])
        transaction_as_of = date.fromisoformat(transaction["as_of"])
    except (KeyError, TypeError, ValueError):
        return False
    return two_calendar_years_before(comparison_as_of) <= transaction_as_of <= comparison_as_of


def scenario_comparison_result(product: dict[str, Any]) -> dict[str, Any]:
    target_purchase_price = product.get("offering", {}).get("building_purchase_price_krw")
    target_area = product.get("basic_info", {}).get("gross_floor_area_m2")
    if not is_positive_number(target_purchase_price) or not is_positive_number(target_area):
        return {
            "status": "held",
            "classification": "판정 보류",
            "candidate_count": 0,
            "target_price_per_m2_krw": None,
            "median_price_per_m2_krw": None,
            "deviation_pct": None,
            "sample": True,
            "source_status": "demo_scenario",
            "reason": "대상 건물 매입가 또는 연면적이 유효한 양수 숫자가 아니어서 가격 비교를 보류합니다.",
        }
    transactions = product.get("comparison_transactions", [])
    candidates = [
        transaction
        for transaction in transactions
        if isinstance(transaction, dict) and is_valid_scenario_candidate(product, transaction)
    ]
    prices = [transaction["sale_amount_krw"] / transaction["gross_floor_area_m2"] for transaction in candidates]
    if len(prices) < 3:
        return {
            "status": "held",
            "classification": "판정 보류",
            "candidate_count": len(prices),
            "target_price_per_m2_krw": None,
            "median_price_per_m2_krw": None,
            "deviation_pct": None,
            "sample": True,
            "source_status": "demo_scenario",
            "reason": "가상 비교 후보가 최소 3건에 못 미쳐 가격 분류를 보류합니다.",
        }
    target_price = target_purchase_price / target_area
    median_price = median(prices)
    deviation_pct = round((target_price / median_price - 1) * 100, 2)
    classification = (
        "높음" if deviation_pct > 10 else "낮음" if deviation_pct < -10 else "유사 거래 범위 내"
    )
    return {
        "status": "sample",
        "classification": classification,
        "candidate_count": len(prices),
        "target_price_per_m2_krw": round(target_price, 2),
        "median_price_per_m2_krw": round(median_price, 2),
        "deviation_pct": deviation_pct,
        "sample": True,
        "source_status": "demo_scenario",
        "transactions": candidates,
        "reason": "가상 비교거래의 매각가÷연면적과 가상 건물 매입가÷연면적을 비교한 검증 전 샘플 계산입니다.",
    }


def review_summary_for_api_example(links: list[dict[str, Any]], comparison: dict[str, Any]) -> dict[str, dict[str, Any]]:
    link_by_id = {link["id"]: link for link in links}
    legal = link_by_id["legal_dong"]
    rtms = link_by_id["rtms"]
    ecos = link_by_id["ecos"]
    has_candidate = rtms["status"] == "comparison_candidate" and comparison["candidate_count"] > 0
    return {
        "location": {
            "label": "주소·지역 확인",
            "status": "confirmed" if legal["status"] == "matched" else "held",
            "summary": "서울 종로구 창신동 지역 확인" if legal["status"] == "matched" else "서울 종로구 창신동 지역 연결 보류",
            "limitations": "지역 확인은 실제 건물 또는 상품의 동일성을 뜻하지 않습니다.",
            "sample": True,
        },
        "building_identity": {
            "label": "건물 동일성",
            "status": "held",
            "summary": "현재 건축HUB 조회 범위가 달라 건물 동일성 판정을 보류합니다.",
            "limitations": "창신동 대상의 건축물대장 조회와 건물 식별자가 필요합니다.",
            "sample": True,
        },
        "price_comparison": {
            "label": "가격 비교",
            "status": "candidate" if has_candidate else "held",
            "summary": f"실거래 1차 비교 후보 {comparison['candidate_count']}건을 찾았지만 가격 판정은 보류합니다." if has_candidate else "검증 가능한 실거래 비교 후보가 없어 가격 판정을 보류합니다.",
            "limitations": comparison["reason"],
            "sample": True,
        },
        "market_context": {
            "label": "시장환경",
            "status": "context" if ecos["status"] == "context" else "held",
            "summary": "한국은행 기준금리를 거시 맥락으로 연결합니다." if ecos["status"] == "context" else "거시 맥락 연결을 보류합니다.",
            "limitations": "금리는 상품 가격·동일성 또는 수익을 증명하지 않습니다.",
            "sample": True,
        },
        "disclosure_operator": {
            "label": "공시·운영사",
            "status": "held",
            "summary": "실제 공시 식별자와 운영사 검증 근거가 없어 연결을 보류합니다.",
            "limitations": "OpenDART 응답 목록은 가상 상품 관련 공시를 뜻하지 않습니다.",
            "sample": True,
        },
    }


def review_summary_for_scenario(product: dict[str, Any], comparison: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        "location": {"label": "주소·지역 확인", "status": "sample", "summary": f"{product['basic_info']['region']} 가상 지역 입력", "limitations": "실제 주소·지역 확인이 아닙니다.", "sample": True},
        "building_identity": {"label": "건물 동일성", "status": "sample", "summary": "가상 건물 정보 입력", "limitations": "건축물대장 또는 건물 식별자와 대조하지 않았습니다.", "sample": True},
        "price_comparison": {"label": "가격 비교", "status": "sample", "summary": f"가상 비교거래 {comparison['candidate_count']}건 기준 {comparison['classification']}", "limitations": comparison["reason"], "sample": True},
        "market_context": {"label": "시장환경", "status": "sample", "summary": "가상 시장환경 시나리오", "limitations": "실제 금리·임대료·공실률과 연결하지 않았습니다.", "sample": True},
        "disclosure_operator": {"label": "공시·운영사", "status": "sample", "summary": "가상 운영사 시나리오", "limitations": "실제 공시·운영사 검증을 수행하지 않았습니다.", "sample": True},
    }


def evidence_review_for_scenario(product: dict[str, Any], comparison: dict[str, Any]) -> dict[str, Any]:
    review = dict(product["evidence_review"])
    review["price_review"] = comparison["classification"]
    review["items"] = [
        *[dict(item) for item in review["items"]],
        {
            "title": "가상 비교거래 시나리오",
            "source_type": "demo_scenario",
            "as_of": None,
            "status": "샘플",
            "sample": True,
            "record_is_sample": True,
            "linkage_is_sample": True,
            "applicability_status": "시나리오",
            "limitations": comparison["reason"],
        },
    ]
    return review


def liquidated_outcome(product: dict[str, Any]) -> dict[str, Any]:
    performance = product.get("performance")
    if not isinstance(performance, dict):
        raise ValueError(f"종료 상품 성과 정보가 필요합니다: {product.get('product_id')}")
    total_offering = performance["total_offering_amount_krw"]
    total_recovery = (
        performance["investor_net_sale_distribution_krw"]
        + performance["cumulative_rental_distribution_krw"]
    )
    profit_loss = total_recovery - total_offering
    reconciliation = performance["sale_reconciliation"]
    unreconciled_amount = (
        reconciliation["sale_amount_krw"]
        - reconciliation["sale_cost_krw"]
        - reconciliation["sample_tax_krw"]
        - reconciliation["sample_other_settlement_krw"]
        - reconciliation["investor_net_sale_distribution_krw"]
    )
    return {
        "metric_name": "공모총액 대비 단순 누적 회수손익률",
        "total_recovery_krw": total_recovery,
        "realized_profit_loss_krw": profit_loss,
        "realized_profit_loss_pct": round(profit_loss / total_offering * 100, 2),
        "annualized": False,
        "irr": False,
        "cashflow_timing_reflected": False,
        "tax_basis": "미확인",
        "unreconciled_amount_krw": unreconciled_amount,
        "term_definitions": {
            "building_purchase_price_krw": "가상 기초 건물 매입가",
            "total_offering_amount_krw": "가상 공모총액으로 매입가와 수수료·예비비·구조 비용 등으로 다를 수 있음",
            "sale_amount_krw": "가상 총매각가",
            "investor_net_sale_distribution_krw": "가상 총매각가에서 가상 매각비용·세금·기타 정산액을 차감한 투자자 순매각분배금",
        },
        "limitation": "최초 공모부터 청산까지 보유하고 공모 전액을 납입했다고 가정한 단순 누적 지표입니다. 개인세금과 2차거래는 반영하지 않습니다.",
        "note": "총 회수금은 투자자 순매각분배금과 누적 임대분배금의 합계이며, 모든 정산 항목은 가상 시나리오 값입니다.",
    }


def operator_summaries(liquidated: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    summaries: dict[str, dict[str, Any]] = {}
    for product in liquidated:
        operator_id = product["operator_id"]
        summary = summaries.setdefault(
            operator_id,
            {
                "operator_id": operator_id,
                "operator": product["operator"],
                "liquidated_product_ids": [],
                "sample_size": 0,
                "positive_outcome_count": 0,
                "negative_outcome_count": 0,
                "neutral_outcome_count": 0,
                "operator_attribution_status": "분리 불가",
                "comparable_population_status": "미확인",
                "limitations": "가상 종료 이력의 표본이 적어 운영 역량 평가나 미래 결과 예측에 사용할 수 없습니다.",
            },
        )
        outcome = liquidated_outcome(product)
        summary["liquidated_product_ids"].append(product["product_id"])
        summary["sample_size"] += 1
        if outcome["realized_profit_loss_krw"] > 0:
            summary["positive_outcome_count"] += 1
        elif outcome["realized_profit_loss_krw"] < 0:
            summary["negative_outcome_count"] += 1
        else:
            summary["neutral_outcome_count"] += 1
    return summaries


def product_for_payload(product: dict[str, Any], summaries: dict[str, dict[str, Any]]) -> dict[str, Any]:
    result = dict(product)
    history = dict(product["operator_history"])
    history["summary"] = summaries.get(product["operator_id"])
    result["operator_history"] = history
    basic_info = product.get("basic_info", {})
    result["real_estate"] = {
        "building_use": basic_info.get("building_use"),
        "gross_floor_area_m2": basic_info.get("gross_floor_area_m2"),
        "building_match_status": "unverified",
    }
    if product["status"] == "liquidated":
        result["outcome"] = liquidated_outcome(product)
    return result


def build_payload() -> dict[str, Any]:
    fixture = load_json(FIXTURE_FILE)
    products = fixture.get("products")
    if not isinstance(products, list):
        raise ValueError("더미 상품 목록 형식이 올바르지 않습니다.")
    offering = [item for item in products if isinstance(item, dict) and item.get("status") == "offering"]
    liquidated = [item for item in products if isinstance(item, dict) and item.get("status") == "liquidated"]
    if not offering or not liquidated:
        raise ValueError("진행 중·종료 더미 상품이 각각 필요합니다.")

    summaries = operator_summaries(liquidated)
    offering_payload = [product_for_payload(product, summaries) for product in offering]
    liquidated_payload = [product_for_payload(product, summaries) for product in liquidated]
    links = connection_results(offering[0])
    api_comparison = api_comparison_result(links)
    offering_payload[0]["evidence_review"] = evidence_review_for_api_example(offering[0], links)
    offering_payload[0]["comparison_method"] = comparison_method()
    offering_payload[0]["comparison_result"] = api_comparison
    offering_payload[0]["review_summary"] = review_summary_for_api_example(links, api_comparison)
    offering_payload[0]["offering_breakdown"] = offering_breakdown(offering[0])
    for product, payload_product in zip(offering[1:], offering_payload[1:]):
        scenario_comparison = scenario_comparison_result(product)
        payload_product["evidence_review"] = evidence_review_for_scenario(product, scenario_comparison)
        payload_product["comparison_method"] = comparison_method()
        payload_product["comparison_result"] = scenario_comparison
        payload_product["review_summary"] = review_summary_for_scenario(product, scenario_comparison)
        payload_product["offering_breakdown"] = offering_breakdown(product)
    first_outcome = liquidated_payload[0]["outcome"]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sample": True,
        "notice": fixture["notice"],
        "product": offering_payload[0],
        "historical_product": liquidated_payload[0],
        "products": {
            "offering": offering_payload,
            "liquidated": liquidated_payload,
        },
        "operator_summaries": list(summaries.values()),
        "selected_historical_example": {
            "product_id": liquidated_payload[0]["product_id"],
            "total_recovery_krw": first_outcome["total_recovery_krw"],
            "realized_profit_loss_pct": first_outcome["realized_profit_loss_pct"],
            "warning": "종료 상품의 회수금·손익 계산은 더미 값으로 검증한 흐름이며 실제 성과가 아닙니다.",
        },
        "sources": links,
        "source_status_note": "정규화 결과의 레코드를 더미 상품 연결 기준으로 분류했습니다. 응답 성공은 상품 사실 또는 동일성의 일치가 아닙니다.",
        "review_steps": review_steps(links),
        "limitations": [
            "실제 상품·공시·주소를 사용하지 않은 화면 구조 검증용 데모입니다.",
            "API 응답 수신은 데이터 정확성이나 상품과의 동일성을 의미하지 않습니다.",
            "투자 추천, 수익률 예측, 감정평가 또는 법률 검토를 제공하지 않습니다.",
        ],
    }


def write_payload(payload: dict[str, Any]) -> None:
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    DEMO_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    shutil.copyfile(WEB_SOURCE, DEMO_DIR / "index.html")


def self_check() -> None:
    payload = build_payload()
    assert payload["sample"] is True
    assert payload["product"]["sample"] is True
    assert "가상" in payload["product"]["asset_name"]
    assert len(payload["sources"]) == 6
    offering = payload["products"]["offering"]
    liquidated = payload["products"]["liquidated"]
    assert len(offering) == 3
    assert len(liquidated) == 4
    assert all(product["sample"] is True and product["source_status"] for product in offering + liquidated)
    required_sections = {"basic_info", "offering", "lease", "structure", "risks", "evidence_review", "operator_history"}
    price_review_statuses = {"유사 거래 범위 내", "높음", "낮음", "판정 보류"}
    for product in offering + liquidated:
        assert required_sections <= product.keys()
        assert product["evidence_review"]["price_review"] in price_review_statuses
        assert product["offering"]["security_price_krw"] > 0
        assert product["offering"]["security_quantity"] > 0
        assert product["offering"]["security_price_krw"] * product["offering"]["security_quantity"] == product["offering"]["offering_amount_krw"]
        assert {"trustee", "account_manager", "operator_role", "distribution_basis", "liquidation_flow"} <= product["structure"].keys()
        for item in product["evidence_review"]["items"]:
            assert {"source_type", "as_of", "status", "sample", "record_is_sample", "linkage_is_sample", "applicability_status", "limitations"} <= item.keys()
    assert offering[0]["evidence_review"]["price_review"] == "판정 보류"
    assert offering[0]["evidence_review"]["comparison_search_status"] == "1차 비교 후보 1건"
    assert "거래금액 단위" in offering[0]["evidence_review"]["price_review_reason"]
    assert offering[0]["evidence_review"]["items"][0]["record_is_sample"] is False
    assert offering[0]["evidence_review"]["items"][0]["linkage_is_sample"] is True
    assert offering[0]["evidence_review"]["items"][0]["applicability_status"] == "미검증"
    assert offering[1]["evidence_review"]["price_review"] == "유사 거래 범위 내"
    review_dimensions = {"location", "building_identity", "price_comparison", "market_context", "disclosure_operator"}
    for product in offering:
        assert review_dimensions == product["review_summary"].keys()
        assert {"sample", "source_status", "rules", "limitations"} <= product["comparison_method"].keys()
        assert product["comparison_method"]["rules"]["minimum_candidate_count"] == 3
        assert product["comparison_method"]["rules"]["exclude_cancelled_transactions"] == "취소 거래 제외"
        breakdown = product["offering_breakdown"]
        assert breakdown["difference_krw"] == breakdown["offering_amount_krw"] - breakdown["building_purchase_price_krw"]
    assert offering[0]["comparison_result"]["classification"] == "판정 보류"
    assert offering[0]["comparison_result"]["median_price_per_m2_krw"] is None
    assert offering[0]["comparison_result"]["deviation_pct"] is None
    assert offering[0]["comparison_result"]["candidate_count"] == 1
    assert offering[0]["review_summary"]["location"]["summary"] == "서울 종로구 창신동 지역 확인"
    assert "1111017400" not in offering[0]["review_summary"]["location"]["summary"]
    for product, expected_classification in zip(offering[1:], ("유사 거래 범위 내", "높음")):
        comparison = product["comparison_result"]
        assert comparison["candidate_count"] == 3
        assert comparison["classification"] == expected_classification
        assert comparison["median_price_per_m2_krw"] is not None
        assert comparison["deviation_pct"] is not None
        assert product["evidence_review"]["price_review"] == expected_classification
        assert all(
            transaction["sample"] is True
            and transaction["source_status"] == "demo_scenario"
            and transaction["cancellation_date"] is None
            for transaction in comparison["transactions"]
        )
        assert all(is_valid_scenario_candidate(product, transaction) for transaction in comparison["transactions"])
    scenario_product = offering[1]
    base_transaction = scenario_product["comparison_transactions"][0]
    invalid_transactions = [
        dict(base_transaction, transaction_id="OUTSIDE-AREA", gross_floor_area_m2=700),
        dict(base_transaction, transaction_id="OLD", as_of="2023-01-01"),
        dict(base_transaction, transaction_id="CANCELLED", cancellation_date="2026-01-01"),
        dict(base_transaction, transaction_id="MISSING-AMOUNT", sale_amount_krw=None),
        dict(base_transaction, transaction_id="ZERO-AMOUNT", sale_amount_krw=0),
        dict(base_transaction, transaction_id="STRING-AMOUNT", sale_amount_krw="6600000000"),
        dict(base_transaction, transaction_id="MISSING-AREA", gross_floor_area_m2=None),
        dict(base_transaction, transaction_id="ZERO-AREA", gross_floor_area_m2=0),
        dict(base_transaction, transaction_id="STRING-AREA", gross_floor_area_m2="500"),
        dict(base_transaction, transaction_id="NON-SAMPLE", sample=False),
    ]
    filtered_product = dict(scenario_product)
    filtered_product["comparison_transactions"] = [*scenario_product["comparison_transactions"], *invalid_transactions]
    filtered_result = scenario_comparison_result(filtered_product)
    assert filtered_result["candidate_count"] == 3
    assert {transaction["transaction_id"] for transaction in filtered_result["transactions"]}.isdisjoint(
        {transaction["transaction_id"] for transaction in invalid_transactions}
    )
    insufficient_product = dict(scenario_product)
    insufficient_product["comparison_transactions"] = scenario_product["comparison_transactions"][:2]
    insufficient_result = scenario_comparison_result(insufficient_product)
    assert insufficient_result["candidate_count"] == 2
    assert insufficient_result["classification"] == "판정 보류"
    boundary_product = dict(scenario_product, comparison_as_of="2026-08-01")
    boundary_transaction = dict(base_transaction, as_of="2024-08-01")
    before_boundary_transaction = dict(base_transaction, as_of="2024-07-31")
    assert is_valid_scenario_candidate(boundary_product, boundary_transaction)
    assert not is_valid_scenario_candidate(boundary_product, before_boundary_transaction)
    assert two_calendar_years_before(date(2024, 2, 29)) == date(2022, 2, 28)
    assert all(not is_positive_number(value) for value in (True, float("nan"), float("inf"), float("-inf")))
    for section, field in (("offering", "building_purchase_price_krw"), ("basic_info", "gross_floor_area_m2")):
        for invalid_value in (None, "invalid", 0, float("nan"), float("inf")):
            invalid_target_product = dict(scenario_product)
            invalid_target_product[section] = dict(scenario_product[section])
            invalid_target_product[section][field] = invalid_value
            invalid_target_result = scenario_comparison_result(invalid_target_product)
            assert invalid_target_result["classification"] == "판정 보류"
            assert invalid_target_result["candidate_count"] == 0
            assert invalid_target_result["target_price_per_m2_krw"] is None
    for product in offering:
        references = product["operator_history"]["referenced_product_ids"]
        assert references
        assert set(references) <= {item["product_id"] for item in liquidated}
        assert all(
            next(item for item in liquidated if item["product_id"] == reference)["operator_id"] == product["operator_id"]
            for reference in references
        )
    outcomes = [product["outcome"] for product in liquidated]
    assert all(
        outcome["total_recovery_krw"] == product["performance"]["investor_net_sale_distribution_krw"] + product["performance"]["cumulative_rental_distribution_krw"]
        for product, outcome in zip(liquidated, outcomes)
    )
    assert any(outcome["realized_profit_loss_krw"] > 0 for outcome in outcomes)
    assert any(outcome["realized_profit_loss_krw"] < 0 for outcome in outcomes)
    for product, outcome in zip(liquidated, outcomes):
        assert product["performance"]["total_offering_amount_krw"] == product["offering"]["offering_amount_krw"]
        reconciliation = product["performance"]["sale_reconciliation"]
        assert reconciliation["sample"] is True
        assert reconciliation["source_status"] == "demo_scenario"
        assert reconciliation["sale_amount_krw"] == product["performance"]["sale_amount_krw"]
        assert reconciliation["sale_cost_krw"] == product["performance"]["sale_cost_krw"]
        assert reconciliation["investor_net_sale_distribution_krw"] == product["performance"]["investor_net_sale_distribution_krw"]
        assert outcome["unreconciled_amount_krw"] == 0
        assert outcome["metric_name"] == "공모총액 대비 단순 누적 회수손익률"
        assert outcome["annualized"] is False and outcome["irr"] is False
        assert outcome["cashflow_timing_reflected"] is False and outcome["tax_basis"] == "미확인"
        assert "개인세금" in outcome["limitation"]
        causes = product["cause_candidates"]
        assert "추가 확인이 필요한 설명 가설" in causes["notice"]
        assert causes["causal_attribution"] is False
        assert causes["mutually_exclusive"] is False
        assert causes["additive"] is False
        assert causes["verification_status"] == "미검증"
        assert causes["required_evidence"]
        for category in ("operator", "asset", "external"):
            assert causes[category]
            assert {"direction", "related_observation", "confidence", "limitations"} <= causes[category][0].keys()
    for summary in payload["operator_summaries"]:
        assert summary["sample_size"] == len(summary["liquidated_product_ids"])
        assert summary["neutral_outcome_count"] >= 0
        assert summary["operator_attribution_status"] == "분리 불가"
        assert summary["comparable_population_status"] == "미확인"
        assert "표본이 적어" in summary["limitations"]
    assert "historical_summary" not in payload
    assert payload["selected_historical_example"]["product_id"] == liquidated[0]["product_id"]
    api_products = [
        product
        for product in offering + liquidated
        if any(item["source_type"] == "normalized_public_api" for item in product["evidence_review"]["items"])
    ]
    assert [product["product_id"] for product in api_products] == ["SAMPLE-RE-OFFERING-001"]
    assert payload["product"]["connection_criteria"]["legal_dong_code"] == "1111017400"
    assert payload["product"]["connection_criteria"]["comparison_area_m2"] == 167.8
    links = {link["id"]: link for link in payload["sources"]}
    assert links["legal_dong"]["status"] == "matched"
    assert links["legal_dong"]["subject_id"] == "1111017400"
    assert links["rtms"]["status"] == "comparison_candidate"
    assert len(links["rtms"]["candidates"]) == 1
    assert all(not record["data"]["cancellation_date"] for record in links["rtms"]["candidates"])
    assert len(links["rtms"]["excluded_records"]) == 1
    assert links["ecos"]["status"] == "context"
    assert links["ecos"]["as_of"] == "2026-01-02"
    assert links["ecos"]["subject_id"] == "722Y001|0101000|20260102"
    assert all(links[source]["status"] == "held" for source in ("opendart", "building_hub", "rone"))
    assert all(link["source_url"] and link["fetched_at"] for link in payload["sources"])
    error_source = {
        "status": "provider_error",
        "records": [{"subject_id": "must-not-be-used", "data": {"building_area_m2": "167.8"}}],
    }
    assert records(error_source) == []
    for invalid_area in (None, "", "not-a-number"):
        assert not has_comparison_area({"data": {"building_area_m2": invalid_area}}, 167.8)
    held_rtms_review = evidence_review_for_api_example(
        offering[0],
        [{"id": "rtms", "status": "held", "candidates": []}],
    )
    assert held_rtms_review["comparison_search_status"] == "연결 보류"
    assert "1건" not in held_rtms_review["comparison_search_status"]
    assert held_rtms_review["items"][0]["status"] == "연결 보류"
    assert held_rtms_review["items"][0]["record_is_sample"] is None
    no_candidate_review = evidence_review_for_api_example(
        offering[0],
        [{"id": "rtms", "status": "comparison_candidate", "candidates": []}],
    )
    assert no_candidate_review["comparison_search_status"] == "1차 비교 후보 없음"
    assert "1건" not in no_candidate_review["comparison_search_status"]
    steps = {step["title"]: step for step in payload["review_steps"]}
    assert steps["법정동 연결"]["status"] == "matched"
    assert steps["실거래 1차 후보 검색"]["status"] == "comparison_candidate"
    assert "비교 후보 1건" in steps["실거래 1차 후보 검색"]["detail"]
    assert "가격 판정은 보류" in steps["실거래 1차 후보 검색"]["detail"]
    assert "취소 거래 1건" in steps["실거래 1차 후보 검색"]["detail"]
    assert steps["금리 맥락 연결"]["status"] == "context"
    assert all(steps[title]["status"] == "held" for title in ("공시 사실 구조화", "건물 동일성 대조", "상업용 시장 근거"))
    print("demo self-check 통과")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-check", action="store_true")
    args = parser.parse_args()
    if args.self_check:
        self_check()
        return 0
    write_payload(build_payload())
    print(f"데모 데이터 위치: {DEMO_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
