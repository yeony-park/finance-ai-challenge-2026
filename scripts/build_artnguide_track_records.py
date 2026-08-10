#!/usr/bin/env python3
"""Build the deterministic Art n Guide track-record snapshot from its evidence file."""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import tempfile
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "deliverables/artnguide_artwork_track_records_2026-08-10.md"
OUTPUT = ROOT / "data/artnguide_track_records.json"

RAW_FIELDS = (
    "id",
    "thumbnail",
    "startAt",
    "endAt",
    "gpMoney",
    "soldTime",
    "soldMoney",
    "soldPlace",
    "soldNote",
    "title",
    "authorName",
    "yearItem",
    "artMaterial",
    "artSize",
    "status",
    "profit",
    "dateHold",
    "oldGpVersion",
    "yearProfit",
)

FIELD_DESCRIPTIONS = {
    "id": "목록 레코드 ID",
    "thumbnail": "썸네일 원본 URL. 이미지는 복제하지 않음",
    "startAt": "공동구매일 또는 청약일의 UTC ISO 8601 원값",
    "endAt": "API 원값. 공개 화면에 별도 정의가 확인되지 않음",
    "gpMoney": "공동구매 금액 또는 모집총액, 원 단위",
    "soldTime": "매각일 UTC ISO 8601 원값",
    "soldMoney": "매각금액, 원 단위",
    "soldPlace": "매각처",
    "soldNote": "매각 비고",
    "title": "작품명",
    "authorName": "작가명",
    "yearItem": "제작연도 원문",
    "artMaterial": "재료 원문",
    "artSize": "크기 원문",
    "status": "진행상황 코드",
    "profit": "가격상승률 API 원값",
    "dateHold": "보관기간 일수",
    "oldGpVersion": "API boolean 원값",
    "yearProfit": "연 환산 가격상승률 API 원값",
}

PAGE_API_TEMPLATE = (
    "https://api.artnguide.co.kr/api/v1/gp/use-gp-plan"
    "?page={page}&size=10&listStatus=ALL"
)
THUMBNAIL_HOSTS = {
    "dlhl7mgjzp2mo.cloudfront.net",
    "d2fhfyz9hnn7vv.cloudfront.net",
}


class BuildError(RuntimeError):
    pass


def literal(row: str, field: str):
    if field in {"gpMoney", "soldMoney"}:
        pattern = rf"`{re.escape(field)}` : .*?\(<code>(.*?)</code>\)"
    else:
        pattern = rf"`{re.escape(field)}` : <code>(.*?)</code>"
    match = re.search(pattern, row)
    if not match:
        raise BuildError(f"missing {field}")
    encoded = html.unescape(match.group(1))
    try:
        return json.loads(encoded)
    except json.JSONDecodeError as error:
        raise BuildError(f"invalid {field}: {encoded}") from error


def capture(row: str, pattern: str, label: str) -> str:
    match = re.search(pattern, row)
    if not match:
        raise BuildError(f"missing {label}")
    return html.unescape(match.group(1))


def parse_records(source_text: str) -> tuple[list[dict], list[dict]]:
    records: list[dict] = []
    annotations: list[dict] = []
    page: int | None = None

    for line in source_text.splitlines():
        heading = re.fullmatch(r"## (\d+)페이지", line)
        if heading:
            page = int(heading.group(1))
            continue
        sequence_match = re.match(r"^\| (\d+)<br>`id` : <code>", line)
        if not sequence_match:
            continue
        if page is None:
            raise BuildError("record before page heading")

        sequence = int(sequence_match.group(1))
        thumbnail = capture(
            line,
            r"썸네일 `thumbnail` : \[원본 이미지\]\(<(.*?)>\)",
            "thumbnail",
        )
        record = {
            "id": literal(line, "id"),
            "thumbnail": thumbnail,
            "startAt": literal(line, "startAt"),
            "endAt": literal(line, "endAt"),
            "gpMoney": literal(line, "gpMoney"),
            "soldTime": literal(line, "soldTime"),
            "soldMoney": literal(line, "soldMoney"),
            "soldPlace": literal(line, "soldPlace"),
            "soldNote": literal(line, "soldNote"),
            "title": literal(line, "title"),
            "authorName": literal(line, "authorName"),
            "yearItem": literal(line, "yearItem"),
            "artMaterial": literal(line, "artMaterial"),
            "artSize": literal(line, "artSize"),
            "status": literal(line, "status"),
            "profit": literal(line, "profit"),
            "dateHold": literal(line, "dateHold"),
            "oldGpVersion": literal(line, "oldGpVersion"),
            "yearProfit": literal(line, "yearProfit"),
        }
        if tuple(record) != RAW_FIELDS:
            raise BuildError(f"field order mismatch at sequence {sequence}")

        displayed_dates = re.findall(r"화면 표시일\(KST\) : ([^<]+)<br>", line)
        if len(displayed_dates) != 2:
            raise BuildError(f"display date mismatch at sequence {sequence}")
        transaction_type = capture(line, r"화면 구분 : ([^<]+)<br>", "transaction type")
        money_label = capture(
            line,
            r"(공동구매 금액|모집총액) `gpMoney` :",
            "money label",
        )
        status_label = capture(line, r"화면 상태 : ([^<]+)<br>", "status label")
        profit_display = capture(
            line,
            r"`profit` : <code>.*?</code> / 화면 : ([^<]+)<br>",
            "profit display",
        )
        year_profit_display = capture(
            line,
            r"`yearProfit` : <code>.*?</code> / 화면 : (.*?)<br>",
            "year profit display",
        )
        annotations.append(
            {
                "id": record["id"],
                "sequence": sequence,
                "page": page,
                "position_in_page": sequence - ((page - 1) * 10),
                "page_api_url": PAGE_API_TEMPLATE.format(page=page),
                "display": {
                    "transaction_type": transaction_type,
                    "money_label": money_label,
                    "start_date_kst": displayed_dates[0],
                    "sold_date_kst": None if displayed_dates[1] == "—" else displayed_dates[1],
                    "status_label": status_label,
                    "profit": profit_display,
                    "year_profit": year_profit_display,
                },
            }
        )
        records.append(record)

    return records, annotations


def _blank_distribution(records: list[dict], field: str) -> dict[str, int]:
    values = [record[field] for record in records]
    return {
        "null": sum(value is None for value in values),
        "empty_string": sum(value == "" for value in values),
        "whitespace_only": sum(
            isinstance(value, str) and value != "" and value.strip() == "" for value in values
        ),
        "non_blank": sum(
            isinstance(value, str) and value.strip() != "" for value in values
        ),
    }


def recompute(records: list[dict]) -> dict:
    completed_statuses = {"TRANSFER", "RETURNED_PRODUCT"}
    completed = [record for record in records if record["status"] in completed_statuses]
    return {
        "record_count": len(records),
        "total_gp_money_krw": sum(record["gpMoney"] for record in records),
        "completed_count": len(completed),
        "total_sold_money_krw": sum(record["soldMoney"] for record in completed),
    }


def build_payload(source_text: str | None = None) -> dict:
    source_bytes = SOURCE.read_bytes() if source_text is None else source_text.encode("utf-8")
    text = source_bytes.decode("utf-8")
    records, annotations = parse_records(text)
    recomputed = recompute(records)
    official = {
        "totalGp": 188,
        "totalGpMoney": 49_601_300_000,
        "totalGpTransfered": 151,
        "totalGpTransferedMoney": 41_521_212_500,
        "avgProfit": 23.45682119205298,
        "avgDateHold": 444.5960264900662,
        "avgYearProfit": 205,
    }
    transfer_rate = official["totalGpTransfered"] / official["totalGp"] * 100
    discrepancies = [
        {
            "metric": "record_count",
            "official": official["totalGp"],
            "recomputed": recomputed["record_count"],
            "difference": official["totalGp"] - recomputed["record_count"],
        },
        {
            "metric": "total_gp_money_krw",
            "official": official["totalGpMoney"],
            "recomputed": recomputed["total_gp_money_krw"],
            "difference": official["totalGpMoney"] - recomputed["total_gp_money_krw"],
        },
        {
            "metric": "completed_count",
            "official": official["totalGpTransfered"],
            "recomputed": recomputed["completed_count"],
            "difference": official["totalGpTransfered"] - recomputed["completed_count"],
        },
        {
            "metric": "total_sold_money_krw",
            "official": official["totalGpTransferedMoney"],
            "recomputed": recomputed["total_sold_money_krw"],
            "difference": official["totalGpTransferedMoney"]
            - recomputed["total_sold_money_krw"],
        },
    ]
    status_counts = Counter(record["status"] for record in records)
    version_counts = Counter(record["oldGpVersion"] for record in records)
    pages = [
        {
            "page": page,
            "count": sum(annotation["page"] == page for annotation in annotations),
            "api_url": PAGE_API_TEMPLATE.format(page=page),
        }
        for page in range(1, 20)
    ]
    payload = {
        "schema_version": "1.0.0",
        "dataset": {
            "id": "artnguide-gp-track-records-2026-08-10",
            "title": "아트앤가이드 청약·공동구매 매각현황 트랙레코드",
            "kind": "service_platform_self_reported_track_record",
            "mode": "verified_snapshot",
            "collected_at": {
                "from": "2026-08-10 21:10 KST",
                "to": "2026-08-10 21:15 KST",
            },
            "verified_at": "2026-08-10 21:22 KST",
            "as_of": "2026-08-10T21:22:00+09:00",
            "record_count": len(records),
            "page_count": 19,
            "source_document": "deliverables/artnguide_artwork_track_records_2026-08-10.md",
            "source_document_sha256": hashlib.sha256(source_bytes).hexdigest(),
            "legal_issuer_mapping_status": "unverified",
            "independent_verification_status": "not_performed",
            "api_documentation_status": "not_confirmed",
        },
        "sources": [
            {
                "id": "purchase-summary-page",
                "label": "아트앤가이드 청약·공동구매 작품 매각현황",
                "url": "https://artnguide.co.kr/purchase-summary",
                "role": "public_page",
            },
            {
                "id": "use-gp-plan-api",
                "label": "목록 first-party internal API",
                "url": "https://api.artnguide.co.kr/api/v1/gp/use-gp-plan",
                "role": "record_source",
            },
            {
                "id": "gp-stats-api",
                "label": "상단 집계 first-party internal API",
                "url": "https://api.artnguide.co.kr/api/v1/gp/gp-stats",
                "role": "summary_source",
            },
            {
                "id": "field-mapping-js",
                "label": "현재 purchase-summary JavaScript chunk",
                "url": "https://artnguide.co.kr/static/js/68.b8daea8e.chunk.js",
                "role": "display_mapping_source",
            },
        ],
        "limitations": [
            "아트앤가이드·열매컴퍼니가 사이트와 API에 게시한 값이며 각 거래를 외부 자료로 독립 검증한 결과가 아닙니다.",
            "목록 API는 현재 사이트가 사용하는 first-party endpoint이지만 외부 개발자용 공개 API로 문서화됐는지는 확인되지 않았습니다.",
            "endAt의 공개 정의는 확인되지 않았습니다.",
            "avgYearProfit 원값 205의 단위와 산식은 확인되지 않았습니다.",
            "법적 발행사 연결은 확인하지 않았습니다.",
        ],
        "record_fields": [
            {"name": field, "description": FIELD_DESCRIPTIONS[field]} for field in RAW_FIELDS
        ],
        "source_pagination": {
            "total_elements": 187,
            "total_pages": 19,
            "page_size": 10,
            "order": "source_response",
            "size_200_order_match": True,
            "pages": pages,
        },
        "official_stats": {
            "raw": official,
            "derived": {
                "transferRatePct": transfer_rate,
                "formula": "totalGpTransfered / totalGp * 100",
            },
            "screen_display": {
                "totalGp": "188회",
                "totalGpMoney": "49,601,300,000원",
                "totalGpTransferedMoney": "41,521,212,500원",
                "avgProfit": "23%",
                "avgDateHold": "445일",
                "avgYearProfit": None,
                "transferRatePct": "80%",
            },
        },
        "recomputed_stats": recomputed,
        "known_discrepancies": {
            "cause": "확인 불가",
            "items": discrepancies,
        },
        "distributions": {
            "status": dict(sorted(status_counts.items())),
            "oldGpVersion": {
                "true": version_counts[True],
                "false": version_counts[False],
            },
            "soldNote": _blank_distribution(records, "soldNote"),
            "soldPlace": _blank_distribution(records, "soldPlace"),
            "yearItem": _blank_distribution(records, "yearItem"),
            "artMaterial": _blank_distribution(records, "artMaterial"),
            "startAt": {
                "min": min(record["startAt"] for record in records),
                "max": max(record["startAt"] for record in records),
            },
        },
        "display_rules": {
            "strings": "JSON 문자열 원값을 보존하며 null, 빈 문자열, 공백 문자열, 숫자 0을 구분합니다.",
            "dates": "UTC ISO 8601 원값과 KST 화면 표시일을 분리합니다.",
            "transaction_type": "KST 표시일이 2023.08.31보다 뒤면 청약·모집총액, 그 이전이면 공동구매·공동구매 금액으로 표시합니다.",
            "status": {
                "TRANSFER": "매각완료",
                "RETURNED_PRODUCT": "매각완료",
                "EXPECTED_TRANSFER": "매각예정",
            },
            "profit": "API 소수 원값과 화면 표시값을 분리합니다.",
            "two_year_profit": "별도 API 필드가 아니며 화면 코드가 yearProfit × 2를 반올림한 표시값입니다.",
            "zero_value_exception": "id 16의 profit 0과 yearProfit 0은 원값이며 원 사이트 화면의 '-' 표시는 truthy 검사 결과입니다.",
            "expected_transfer": "EXPECTED_TRANSFER의 soldMoney 0은 0원 매각을 뜻하지 않습니다.",
            "thumbnail": "원본 URL만 보존하며 이미지 파일은 복제하지 않습니다.",
        },
        "validation": {
            "all_page_results_true": True,
            "all_page_metadata_match": True,
            "unique_ids": len({record["id"] for record in records}),
            "duplicate_ids": len(records) - len({record["id"] for record in records}),
            "all_records_have_19_fields": all(tuple(record) == RAW_FIELDS for record in records),
            "source_order_preserved": True,
            "null_empty_whitespace_zero_preserved": True,
            "utc_and_kst_dates_preserved": True,
            "raw_and_display_status_preserved": True,
            "official_and_recomputed_difference_preserved": True,
            "markdown_escaping_handled": True,
            "thumbnail_files_copied": False,
        },
        "records": records,
        "record_annotations": annotations,
    }
    validate(payload)
    return payload


def _kst_date(value: str) -> str:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.astimezone(ZoneInfo("Asia/Seoul")).strftime("%Y.%m.%d")


def validate(payload: dict) -> None:
    records = payload["records"]
    annotations = payload["record_annotations"]
    if len(records) != 187 or len(annotations) != 187:
        raise BuildError("record count")
    if [annotation["sequence"] for annotation in annotations] != list(range(1, 188)):
        raise BuildError("source order")
    if len({record["id"] for record in records}) != 187:
        raise BuildError("record ids")
    if any(tuple(record) != RAW_FIELDS for record in records):
        raise BuildError("record fields")
    if [sum(annotation["page"] == page for annotation in annotations) for page in range(1, 20)] != [10] * 18 + [7]:
        raise BuildError("pagination")
    if Counter(record["status"] for record in records) != {
        "TRANSFER": 138,
        "RETURNED_PRODUCT": 12,
        "EXPECTED_TRANSFER": 37,
    }:
        raise BuildError("status distribution")
    if Counter(record["oldGpVersion"] for record in records) != {True: 175, False: 12}:
        raise BuildError("version distribution")
    expected = [record for record in records if record["status"] == "EXPECTED_TRANSFER"]
    if any(
        record["soldMoney"] != 0
        or record["soldTime"] is not None
        or record["profit"] is not None
        or record["dateHold"] is not None
        or record["yearProfit"] is not None
        for record in expected
    ):
        raise BuildError("expected transfer semantics")
    by_id = {record["id"]: record for record in records}
    if by_id[16]["profit"] != 0 or by_id[16]["yearProfit"] != 0:
        raise BuildError("zero values")
    if payload["recomputed_stats"] != {
        "record_count": 187,
        "total_gp_money_krw": 49_598_300_000,
        "completed_count": 150,
        "total_sold_money_krw": 41_513_812_500,
    }:
        raise BuildError("recomputed stats")
    expected_differences = [1, 3_000_000, 1, 7_400_000]
    if [item["difference"] for item in payload["known_discrepancies"]["items"]] != expected_differences:
        raise BuildError("known discrepancies")
    if payload["distributions"]["soldNote"] != {
        "null": 21,
        "empty_string": 166,
        "whitespace_only": 0,
        "non_blank": 0,
    }:
        raise BuildError("sold note blanks")
    if payload["distributions"]["soldPlace"]["null"] != 2 or payload["distributions"]["soldPlace"]["empty_string"] != 14:
        raise BuildError("sold place blanks")
    if payload["distributions"]["yearItem"]["whitespace_only"] != 8:
        raise BuildError("year blanks")
    if payload["distributions"]["artMaterial"]["whitespace_only"] != 1:
        raise BuildError("material blanks")
    if payload["distributions"]["startAt"] != {
        "min": "2018-10-30T01:00:00.000Z",
        "max": "2026-02-05T01:00:00.000Z",
    }:
        raise BuildError("start range")
    for record, annotation in zip(records, annotations):
        if record["id"] != annotation["id"]:
            raise BuildError("annotation identity")
        if _kst_date(record["startAt"]) != annotation["display"]["start_date_kst"]:
            raise BuildError(f"start date display {record['id']}")
        sold_display = annotation["display"]["sold_date_kst"]
        if record["soldTime"] is None:
            if sold_display is not None:
                raise BuildError(f"sold date null {record['id']}")
        elif _kst_date(record["soldTime"]) != sold_display:
            raise BuildError(f"sold date display {record['id']}")
        thumbnail = urlparse(record["thumbnail"])
        if thumbnail.scheme != "https" or thumbnail.hostname not in THUMBNAIL_HOSTS:
            raise BuildError(f"thumbnail URL {record['id']}")
    for source in payload["sources"]:
        parsed = urlparse(source["url"])
        if parsed.scheme != "https" or parsed.username or parsed.password:
            raise BuildError(f"source URL {source['id']}")


def serialise(payload: dict) -> bytes:
    return (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def write(payload: dict, output: Path = OUTPUT) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(prefix=".artnguide-", dir=output.parent, delete=False) as handle:
            handle.write(serialise(payload))
            temporary = Path(handle.name)
        os.chmod(temporary, 0o644)
        os.replace(temporary, output)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="verify checked-in JSON")
    args = parser.parse_args()
    payload = build_payload()
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_bytes() != serialise(payload):
            raise BuildError("checked-in JSON differs from source document")
    else:
        write(payload)
    print(f"PASS: Art n Guide track records {len(payload['records'])}")


if __name__ == "__main__":
    main()
