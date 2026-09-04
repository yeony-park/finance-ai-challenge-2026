#!/usr/bin/env python3
"""최근 API 원문을 변경하지 않고 공통 레코드 형식으로 정규화한다."""

from __future__ import annotations

import argparse
import hashlib
import json
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
OUTPUT_ROOT = ROOT / "output"
NORMALIZED_FILE = OUTPUT_ROOT / "normalized" / "latest.json"
SOURCES = ("opendart", "legal_dong", "rtms", "building_hub", "rone", "ecos")
SOURCE_URLS = {
    "opendart": "https://opendart.fss.or.kr/api/list.json",
    "legal_dong": "https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList",
    "rtms": "https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade",
    "building_hub": "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo",
    "rone": "https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do",
    "ecos": "https://ecos.bok.or.kr/api/StatisticSearch/",
}


def clean(value: Any) -> Any:
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def date_value(value: Any) -> str | None:
    text = str(value or "").strip()
    if len(text) == 8 and text.isdigit():
        return f"{text[:4]}-{text[4:6]}-{text[6:]}"
    return text or None


def latest_file(source: str) -> Path:
    if not OUTPUT_ROOT.exists():
        raise FileNotFoundError("test_scripts/output이 없습니다. 먼저 API를 실행하세요.")
    for run_dir in sorted((path for path in OUTPUT_ROOT.iterdir() if path.is_dir()), reverse=True):
        candidate = run_dir / f"{source}.json"
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"{source} 원문 결과가 없습니다.")


def load_raw(path: Path) -> tuple[dict[str, Any], str]:
    raw_bytes = path.read_bytes()
    value = json.loads(raw_bytes)
    if not isinstance(value, dict):
        raise ValueError(f"원문 결과 최상위 값은 객체여야 합니다: {path}")
    return value, hashlib.sha256(raw_bytes).hexdigest()


def record(record_type: str, subject_id: str, as_of: str | None, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "record_type": record_type,
        "subject_id": subject_id,
        "as_of": as_of,
        "data": {key: clean(value) for key, value in data.items()},
    }


def normalize_opendart(raw: dict[str, Any]) -> tuple[str | None, str | None, int, list[dict[str, Any]]]:
    body = json.loads(raw["body"])
    rows = body.get("list") or []
    records = [
        record(
            "disclosure",
            str(row.get("rcept_no") or ""),
            date_value(row.get("rcept_dt")),
            {
                "corporation_id": row.get("corp_code"),
                "corporation_name": row.get("corp_name"),
                "stock_code": row.get("stock_code"),
                "corporation_class": row.get("corp_cls"),
                "report_name": row.get("report_nm"),
                "filer_name": row.get("flr_nm"),
                "note": row.get("rm"),
            },
        )
        for row in rows
    ]
    return body.get("status"), body.get("message"), int(body.get("total_count") or 0), records


def normalize_legal_dong(raw: dict[str, Any]) -> tuple[str | None, str | None, int, list[dict[str, Any]]]:
    body = json.loads(raw["body"])
    blocks = body.get("StanReginCd") or []
    head = blocks[0].get("head", []) if blocks else []
    result = next((item["RESULT"] for item in head if "RESULT" in item), {})
    total = next((item.get("totalCount") for item in head if "totalCount" in item), 0)
    rows = blocks[1].get("row", []) if len(blocks) > 1 else []
    records = [
        record(
            "legal_dong_code",
            str(row.get("region_cd") or ""),
            date_value(row.get("adpt_de")),
            {
                "region_code": row.get("region_cd"),
                "sido_code": row.get("sido_cd"),
                "sigungu_code": row.get("sgg_cd"),
                "eupmyeondong_code": row.get("umd_cd"),
                "ri_code": row.get("ri_cd"),
                "address_name": row.get("locatadd_nm"),
                "lowest_region_name": row.get("locallow_nm"),
                "parent_region_code": row.get("locathigh_cd"),
            },
        )
        for row in rows
    ]
    return result.get("resultCode"), result.get("resultMsg"), int(total or 0), records


def normalize_rtms(raw: dict[str, Any]) -> tuple[str | None, str | None, int, list[dict[str, Any]]]:
    root = ET.fromstring(raw["body"])
    rows = root.findall(".//item")
    records = []
    for index, item in enumerate(rows):
        row = {child.tag: clean(child.text) for child in item}
        contract_date = date_value(
            f"{row.get('dealYear') or ''}{str(row.get('dealMonth') or '').zfill(2)}{str(row.get('dealDay') or '').zfill(2)}"
        )
        subject_parts = (
            row.get("sggCd"), row.get("umdNm"), row.get("jibun"), contract_date,
            row.get("dealAmount"), row.get("buildingAr"),
        )
        subject_id = "|".join([*(str(value or "") for value in subject_parts), str(index)])
        records.append(
            record(
                "real_estate_transaction",
                subject_id,
                contract_date,
                {
                    "region_code": row.get("sggCd"),
                    "district_name": row.get("sggNm"),
                    "legal_dong_name": row.get("umdNm"),
                    "partial_lot_number": row.get("jibun"),
                    "building_type": row.get("buildingType"),
                    "building_use": row.get("buildingUse"),
                    "building_area_m2": row.get("buildingAr"),
                    "land_area_m2": row.get("plottageAr"),
                    "build_year": row.get("buildYear"),
                    "floor": row.get("floor"),
                    "deal_amount_source_value": row.get("dealAmount"),
                    "deal_amount_unit": None,
                    "deal_amount_note": "공식 단위 재확인 전 환산 보류",
                    "deal_method": row.get("dealingGbn"),
                    "land_use": row.get("landUse"),
                    "share_deal_type": row.get("shareDealingType"),
                    "cancellation_date": row.get("cdealDay"),
                },
            )
        )
    return root.findtext(".//resultCode"), root.findtext(".//resultMsg"), int(root.findtext(".//totalCount") or 0), records


def normalize_building_hub(raw: dict[str, Any]) -> tuple[str | None, str | None, int, list[dict[str, Any]]]:
    response = json.loads(raw["body"]).get("response", {})
    header = response.get("header", {})
    body = response.get("body", {})
    rows = body.get("items", {}).get("item", [])
    rows = rows if isinstance(rows, list) else [rows] if rows else []
    records = [
        record(
            "building_register_title",
            str(row.get("mgmBldrgstPk") or row.get("bldgId") or ""),
            date_value(row.get("crtnDay")),
            {
                "building_register_id": row.get("mgmBldrgstPk"),
                "building_id": row.get("bldgId"),
                "lot_address": row.get("platPlc"),
                "road_address": row.get("newPlatPlc"),
                "building_name": row.get("bldNm"),
                "main_use": row.get("mainPurpsCdNm"),
                "detailed_use": row.get("etcPurps"),
                "land_area_m2": row.get("platArea"),
                "building_area_m2": row.get("archArea"),
                "gross_floor_area_m2": row.get("totArea"),
                "floor_area_ratio_area_m2": row.get("vlRatEstmTotArea"),
                "structure": row.get("strctCdNm"),
                "household_count": row.get("hhldCnt"),
                "use_approval_date": date_value(row.get("useAprDay")),
            },
        )
        for row in rows
    ]
    return header.get("resultCode"), header.get("resultMsg"), int(body.get("totalCount") or 0), records


def normalize_rone(raw: dict[str, Any]) -> tuple[str | None, str | None, int, list[dict[str, Any]]]:
    blocks = json.loads(raw["body"], parse_float=str).get("SttsApiTblData") or []
    head = blocks[0].get("head", []) if blocks else []
    result = next((item["RESULT"] for item in head if "RESULT" in item), {})
    total = next((item.get("list_total_count") for item in head if "list_total_count" in item), 0)
    rows = blocks[1].get("row", []) if len(blocks) > 1 else []
    records = [
        record(
            "regional_market_statistic",
            "|".join(str(row.get(key) or "") for key in ("STATBL_ID", "WRTTIME_IDTFR_ID", "CLS_ID", "ITM_ID")),
            date_value(row.get("WRTTIME_IDTFR_ID")),
            {
                "table_id": row.get("STATBL_ID"),
                "cycle": row.get("DTACYCLE_CD"),
                "time_description": row.get("WRTTIME_DESC"),
                "region_id": row.get("CLS_ID"),
                "region_name": row.get("CLS_NM"),
                "region_full_name": row.get("CLS_FULLNM"),
                "item_id": row.get("ITM_ID"),
                "item_name": row.get("ITM_NM"),
                "value": row.get("DTA_VAL"),
                "unit": row.get("UI_NM"),
            },
        )
        for row in rows
    ]
    return result.get("CODE"), result.get("MESSAGE"), int(total or 0), records


def normalize_ecos(raw: dict[str, Any]) -> tuple[str | None, str | None, int, list[dict[str, Any]]]:
    body = json.loads(raw["body"], parse_float=str)
    error = body.get("RESULT") or {}
    table = body.get("StatisticSearch") or {}
    rows = table.get("row") or []
    records = [
        record(
            "macro_statistic",
            "|".join(str(row.get(key) or "") for key in ("STAT_CODE", "ITEM_CODE1", "TIME")),
            date_value(row.get("TIME")),
            {
                "table_id": row.get("STAT_CODE"),
                "table_name": row.get("STAT_NAME"),
                "item_id": row.get("ITEM_CODE1"),
                "item_name": row.get("ITEM_NAME1"),
                "value": row.get("DATA_VALUE"),
                "unit": row.get("UNIT_NAME"),
            },
        )
        for row in rows
    ]
    return error.get("CODE"), error.get("MESSAGE"), int(table.get("list_total_count") or 0), records


NORMALIZERS = {
    "opendart": normalize_opendart,
    "legal_dong": normalize_legal_dong,
    "rtms": normalize_rtms,
    "building_hub": normalize_building_hub,
    "rone": normalize_rone,
    "ecos": normalize_ecos,
}
SUCCESS_CODES = {
    "opendart": "000",
    "legal_dong": "INFO-0",
    "rtms": "000",
    "building_hub": "00",
    "rone": "INFO-000",
}


def normalize_source(source: str) -> dict[str, Any]:
    raw_file = latest_file(source)
    raw, raw_hash = load_raw(raw_file)
    base = {
        "source": source,
        "source_url": SOURCE_URLS[source],
        "fetched_at": raw.get("fetched_at"),
        "http_status": raw.get("status_code"),
        "request_parameters": raw.get("request_parameters", {}),
        "raw_file": str(raw_file.relative_to(ROOT)),
        "raw_sha256": raw_hash,
        "raw_preserved": True,
    }
    if raw.get("error"):
        return base | {
            "status": "transport_error",
            "provider_code": None,
            "provider_message": raw.get("message"),
            "total_count": 0,
            "normalized_count": 0,
            "records": [],
        }

    code, message, total, records = NORMALIZERS[source](raw)
    success = (source == "ecos" and not code) or code == SUCCESS_CODES.get(source)
    status = "ok" if success and records else "empty" if success else "provider_error"
    return base | {
        "status": status,
        "provider_code": code,
        "provider_message": message,
        "total_count": total,
        "normalized_count": len(records),
        "records": records,
    }


def build_payload() -> dict[str, Any]:
    return {
        "schema_version": "0.1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "raw_policy": "원본 파일은 수정하지 않으며 raw_file과 raw_sha256으로 연결합니다.",
        "status_meaning": "ok는 전송·기관 코드·파싱 성공이며 상품 관련성이나 사실 정확성 판정이 아닙니다.",
        "sources": [normalize_source(source) for source in SOURCES],
    }


def write_payload(payload: dict[str, Any]) -> None:
    NORMALIZED_FILE.parent.mkdir(parents=True, exist_ok=True)
    NORMALIZED_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def self_check() -> None:
    before = {source: load_raw(latest_file(source))[1] for source in SOURCES}
    payload = build_payload()
    after = {source: load_raw(latest_file(source))[1] for source in SOURCES}
    assert before == after
    assert [item["source"] for item in payload["sources"]] == list(SOURCES)
    assert all(item["status"] == "ok" and item["raw_preserved"] for item in payload["sources"])
    assert all(item["normalized_count"] > 0 for item in payload["sources"])
    for source in payload["sources"]:
        records = source["records"]
        assert source["normalized_count"] == len(records) <= source["total_count"]
        assert all(set(item) == {"record_type", "subject_id", "as_of", "data"} for item in records)
        assert all(item["record_type"] and item["subject_id"] and isinstance(item["data"], dict) for item in records)
        if source["source"] == "rtms":
            assert len({item["subject_id"] for item in records}) == len(records)
    print("normalization self-check 통과")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-check", action="store_true")
    args = parser.parse_args()
    if args.self_check:
        self_check()
        return 0
    write_payload(build_payload())
    print(f"정규화 결과 위치: {NORMALIZED_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
