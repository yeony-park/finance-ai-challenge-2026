#!/usr/bin/env python3
"""Build the deterministic WeShareArt research snapshot from two Markdown sources."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
from collections import Counter
from pathlib import Path
from urllib.parse import parse_qsl, parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
TRACK_SOURCE = ROOT / "deliverables/weshareart_co_purchase_track_records_2026-08-10.md"
SUITABILITY_SOURCE = (
    ROOT
    / "deliverables/weshareart_investment_contract_securities_suitability_test_2026-08-10.md"
)
OUTPUT = ROOT / "data/weshareart_research.json"

LIST_FIELDS = (
    "goodsCoPurchaseId",
    "goodsId",
    "goodsName",
    "coPurchaseStatusCategory",
    "coPurchaseStatus",
    "investBeginDateTime",
    "investEndDateTime",
    "saleYieldPercent",
    "artistNameForKorean",
    "artistNameForEnglish",
    "titleForKorean",
    "titleForEnglish",
    "goodsDetail",
    "representativeGoodsImageUrl",
    "showKakaopayList",
    "opened",
    "dday",
    "dDay",
)

DETAIL_FIELDS = (
    "id",
    "artwork",
    "type",
    "name",
    "quantity",
    "pieceAmount",
    "estimateMinAmount",
    "estimateMaxAmount",
    "investBeginDateTime",
    "investEndDateTime",
    "availableQuantity",
    "interviewUrl",
    "saleYieldPercent",
    "keepingDays",
    "imageList",
    "statusCategoryCode",
    "status",
    "purchasedPercent",
    "purchasedQuantity",
)

ARTWORK_FIELDS = (
    "id",
    "artist",
    "title",
    "material",
    "size1",
    "size2",
    "size3",
    "size3Type",
    "setComposition",
    "edition",
    "productionYear",
    "signatureInfo",
    "provenance",
    "imageUrl",
    "copyrightText",
    "zoomable",
)

PUBLIC_ARTIST_FIELDS = (
    "id",
    "artistName",
    "artistNameForEnglish",
    "artistNameForKorean",
    "_redactedFields",
)

REDACTED_ARTIST_FIELDS = (
    "activityHistory",
    "awardsHistory",
    "displayHistory",
    "imageUrl",
    "information",
    "levelOfEducation",
    "nationality",
    "yearOfBirth",
    "yearOfDeath",
)

EXPECTED_PAGE_COUNTS = [10] * 14 + [5]
EXPECTED_STATUS_COUNTS = {
    ("DISTRIBUTED", "DISTRIBUTED"): 52,
    ("RECRUITED", "BOUGHT"): 93,
}
EXPECTED_ANSWER_SEQUENCE = [2, 2, 2, 2, 2, 2, 1, 2, 1, 2]


class BuildError(RuntimeError):
    pass


def _require(pattern: str, text: str, label: str, flags: int = 0) -> re.Match[str]:
    match = re.search(pattern, text, flags)
    if not match:
        raise BuildError(f"missing {label}")
    return match


def _require_text(text: str, phrase: str, label: str) -> None:
    if phrase not in text:
        raise BuildError(f"missing {label}")


def _parse_time_range(source_text: str, pattern: str, label: str) -> dict:
    raw = _require(pattern, source_text, label, re.MULTILINE).group(1).strip()
    match = re.fullmatch(
        r"(\d{4}-\d{2}-\d{2})\s+(\d{1,2})\s*:\s*(\d{2})"
        r"~(\d{1,2})\s*:\s*(\d{2})\s+KST",
        raw,
    )
    if not match:
        raise BuildError(f"invalid {label}: {raw}")
    date, from_hour, from_minute, to_hour, to_minute = match.groups()
    return {
        "source_text": raw,
        "from": f"{date}T{int(from_hour):02d}:{from_minute}:00+09:00",
        "to": f"{date}T{int(to_hour):02d}:{to_minute}:00+09:00",
    }


def _json_block(block: str, heading: str, label: str) -> dict:
    match = _require(
        rf"{re.escape(heading)}\s*<pre><code class=\"language-json\">"
        r"(.*?)</code></pre>",
        block,
        label,
        re.DOTALL,
    )
    try:
        value = json.loads(match.group(1))
    except json.JSONDecodeError as error:
        raise BuildError(f"invalid {label}: {error}") from error
    if not isinstance(value, dict):
        raise BuildError(f"non-object {label}")
    return value


def _validate_url(url: str, label: str) -> None:
    parsed = urlparse(url.strip())
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise BuildError(f"unsafe URL {label}: {url}")
    if any(key.lower().startswith("utm_") for key, _ in parse_qsl(parsed.query)):
        raise BuildError(f"tracking parameter in {label}: {url}")


def _extract_reference_links(text: str) -> dict[str, str]:
    links = {
        match.group(1): match.group(2)
        for match in re.finditer(r"^- \[([^]]+)\] : <(https://[^>]+)>$", text, re.MULTILINE)
    }
    for label, url in links.items():
        _validate_url(url, label)
    return links


def _blank_distribution(records: list[dict], field: str) -> dict[str, int]:
    values = [record[field] for record in records]
    return {
        "null": sum(value is None for value in values),
        "empty_string": sum(value == "" for value in values),
        "whitespace_only": sum(
            isinstance(value, str) and value != "" and value.strip() == ""
            for value in values
        ),
        "other": sum(
            value is not None
            and value != ""
            and not (isinstance(value, str) and value.strip() == "")
            for value in values
        ),
    }


def _record_page(position: int, page_headings: list[tuple[int, int]]) -> int:
    candidates = [page for start, page in page_headings if start < position]
    if not candidates:
        raise BuildError("record before page heading")
    return candidates[-1]


def parse_track_records(source_text: str) -> dict:
    collected_at = _parse_time_range(
        source_text,
        r"^- \[팩트\] 수집·검증 시점 : (.+)$",
        "track-record timestamp",
    )
    page_headings = [
        (match.start(), int(match.group(1)))
        for match in re.finditer(r"^### (\d+)페이지$", source_text, re.MULTILINE)
    ]
    if [page for _, page in page_headings] != list(range(1, 16)):
        raise BuildError("track-record page headings")

    block_matches = list(
        re.finditer(r"^<details>\n(.*?)^</details>$", source_text, re.MULTILINE | re.DOTALL)
    )
    records: list[dict] = []
    for block_match in block_matches:
        block = block_match.group(1)
        summary = _require(
            r"^<summary>(\d+)\..* / goodsId (\d+)</summary>$",
            block,
            "record summary",
            re.MULTILINE,
        )
        sequence = int(summary.group(1))
        summary_goods_id = int(summary.group(2))
        page = _record_page(block_match.start(), page_headings)
        position_in_page = sequence - ((page - 1) * 10)

        source_match = _require(
            r"^- 원문 : \[상품 화면\]\((https://[^)]+)\) / "
            r"\[목록 API\]\((https://[^)]+)\) / "
            r"\[공개 상세 API\]\((https://[^)]+)\) / "
            r"\[장문 상세 콘텐츠 API\]\((https://[^)]+)\)$",
            block,
            f"record sources {sequence}",
            re.MULTILINE,
        )
        source_urls = {
            "goods_page": source_match.group(1),
            "list_api": source_match.group(2),
            "detail_api": source_match.group(3),
            "detail_content_api": source_match.group(4),
        }
        for source_name, url in source_urls.items():
            _validate_url(url, f"record {sequence} {source_name}")

        list_record = _json_block(block, "목록 API 18개 필드 원값", f"list JSON {sequence}")
        detail = _json_block(
            block,
            "공개 상세 API 원값 — 작가 프로필 개인정보 제거본",
            f"detail JSON {sequence}",
        )
        if tuple(list_record) != LIST_FIELDS:
            raise BuildError(f"list field order {sequence}")
        if len(detail) != len(DETAIL_FIELDS) or set(detail) != set(DETAIL_FIELDS):
            raise BuildError(f"detail field set {sequence}")
        artwork = detail.get("artwork")
        if not isinstance(artwork, dict) or tuple(artwork) != ARTWORK_FIELDS:
            raise BuildError(f"artwork field order {sequence}")
        artist = artwork.get("artist")
        if not isinstance(artist, dict) or tuple(artist) != PUBLIC_ARTIST_FIELDS:
            raise BuildError(f"artist field order {sequence}")
        if tuple(artist.get("_redactedFields", ())) != REDACTED_ARTIST_FIELDS:
            raise BuildError(f"artist redaction marker {sequence}")
        if tuple(detail.get("imageList", {})) != ("list",):
            raise BuildError(f"image list fields {sequence}")

        goods_id = list_record["goodsId"]
        if goods_id != summary_goods_id or detail["id"] != goods_id:
            raise BuildError(f"record identity {sequence}")
        parsed_list_query = parse_qs(urlparse(source_urls["list_api"]).query)
        if parsed_list_query.get("page") != [str(page)] or parsed_list_query.get("size") != ["10"]:
            raise BuildError(f"page source URL {sequence}")
        expected_goods_suffixes = {
            "goods_page": f"/goodsDetail/{goods_id}",
            "detail_api": f"id={goods_id}",
            "detail_content_api": f"goodsId={goods_id}",
        }
        if not urlparse(source_urls["goods_page"]).path.endswith(
            expected_goods_suffixes["goods_page"]
        ):
            raise BuildError(f"goods page URL {sequence}")
        if urlparse(source_urls["detail_api"]).query != expected_goods_suffixes["detail_api"]:
            raise BuildError(f"detail API URL {sequence}")
        if (
            urlparse(source_urls["detail_content_api"]).query
            != expected_goods_suffixes["detail_content_api"]
        ):
            raise BuildError(f"content API URL {sequence}")

        records.append(
            {
                "sequence": sequence,
                "page": page,
                "position_in_page": position_in_page,
                "source_urls": source_urls,
                "list": list_record,
                "detail": detail,
            }
        )

    _validate_track_records(records)
    list_records = [record["list"] for record in records]
    artwork_image_urls: list[str] = []
    image_list_urls: list[str] = []
    for record in records:
        detail = record["detail"]
        artwork_image = detail["artwork"]["imageUrl"]
        if isinstance(artwork_image, str) and artwork_image.strip():
            artwork_image_urls.append(artwork_image)
        image_list = detail["imageList"]["list"]
        if not isinstance(image_list, list):
            raise BuildError(f"non-list image list {record['sequence']}")
        image_list_urls.extend(image_list)
    all_image_urls = artwork_image_urls + image_list_urls
    for index, url in enumerate(all_image_urls, start=1):
        if not isinstance(url, str):
            raise BuildError(f"non-string image URL {index}")
        _validate_url(url.strip(), f"detail image {index}")

    image_counts_match = _require(
        r"공개 상세 `imageList\.list` URL : ([\d,]+)개\. 별도 "
        r"`artwork\.imageUrl` ([\d,]+)개를 합치면 ([\d,]+)개이며 모두 고유합니다",
        source_text,
        "detail image counts",
    )
    declared_image_list_count, declared_artwork_image_count, declared_total_image_count = (
        int(value.replace(",", "")) for value in image_counts_match.groups()
    )
    normalized_image_urls = [url.strip() for url in all_image_urls]
    if (
        len(image_list_urls) != declared_image_list_count
        or len(artwork_image_urls) != declared_artwork_image_count
        or len(all_image_urls) != declared_total_image_count
        or len(set(normalized_image_urls)) != declared_total_image_count
    ):
        raise BuildError("detail image count metadata")

    content_counts_match = _require(
        r"상세 콘텐츠는 합계 ([\d,]+)개 섹션입니다\. 유형별로 "
        r"`ARTWORK_INFO` ([\d,]+)개, `ART_DIRECTOR` ([\d,]+)개, "
        r"`GOODS_NEWS` ([\d,]+)개, `INVEST` ([\d,]+)개, `SUMMARY` ([\d,]+)개",
        source_text,
        "detail content counts",
    )
    content_numbers = [int(value.replace(",", "")) for value in content_counts_match.groups()]
    content_type_counts = dict(
        zip(
            ("ARTWORK_INFO", "ART_DIRECTOR", "GOODS_NEWS", "INVEST", "SUMMARY"),
            content_numbers[1:],
        )
    )
    if sum(content_type_counts.values()) != content_numbers[0]:
        raise BuildError("detail content count sum")

    status_counter = Counter(
        (record["coPurchaseStatusCategory"], record["coPurchaseStatus"])
        for record in list_records
    )
    sale_yields = [record["saleYieldPercent"] for record in list_records]
    pages = []
    for page in range(1, 16):
        rows = [record for record in records if record["page"] == page]
        pages.append(
            {
                "page": page,
                "count": len(rows),
                "first_goods_id": rows[0]["list"]["goodsId"],
                "last_goods_id": rows[-1]["list"]["goodsId"],
                "screen_url": rows[0]["source_urls"]["goods_page"].split("/goodsDetail/")[0]
                + f"/goods?type=ALL&page={page}",
                "list_api_url": rows[0]["source_urls"]["list_api"],
            }
        )
        _validate_url(pages[-1]["screen_url"], f"page {page} screen")

    track_page_url = _require(
        r"수집 대상 : \[[^]]+\]\((https://[^)]+)\)", source_text, "track page URL"
    ).group(1)
    all_records_api_url = _require(
        r"목록 원문 : \[[^]]+\]\((https://[^)]+)\)", source_text, "all-records API URL"
    ).group(1)
    enum_url = _require(
        r"\[상태 enum 원문\]\((https://[^)]+)\)", source_text, "status enum URL"
    ).group(1)
    for label, url in (
        ("track page", track_page_url),
        ("all-records API", all_records_api_url),
        ("status enum", enum_url),
    ):
        _validate_url(url, label)

    return {
        "collected_at": collected_at,
        "sources": {
            "track_page": track_page_url,
            "all_records_api": all_records_api_url,
            "status_enum_api": enum_url,
        },
        "record_fields": list(LIST_FIELDS),
        "detail_fields": {
            "top_level": list(DETAIL_FIELDS),
            "observed_top_level_key_orders": [
                {"fields": list(fields), "record_count": count}
                for fields, count in Counter(tuple(record["detail"]) for record in records).items()
            ],
            "artwork": list(ARTWORK_FIELDS),
            "artist_public": list(PUBLIC_ARTIST_FIELDS),
            "artist_redacted": list(REDACTED_ARTIST_FIELDS),
            "image_list": ["list"],
        },
        "source_pagination": {
            "total_elements": len(records),
            "total_pages": len(pages),
            "page_size": 10,
            "last_page_size": 5,
            "order": "source_response",
            "pages": pages,
        },
        "distributions": {
            "status": [
                {
                    "coPurchaseStatusCategory": category,
                    "coPurchaseStatus": status,
                    "count": count,
                }
                for (category, status), count in sorted(status_counter.items())
            ],
            "saleYieldPercent": {
                "min": min(sale_yields),
                "max": max(sale_yields),
                "positive": sum(value > 0 for value in sale_yields),
                "zero": sum(value == 0 for value in sale_yields),
                "negative": sum(value < 0 for value in sale_yields),
            },
            "goodsDetail": {
                "true": sum(record["goodsDetail"] is True for record in list_records),
                "false": sum(record["goodsDetail"] is False for record in list_records),
            },
            "blank_values": {
                field: _blank_distribution(list_records, field) for field in LIST_FIELDS
            },
        },
        "redaction": {
            "scope": "artist_profile",
            "preserved_public_artist_fields": [
                field for field in PUBLIC_ARTIST_FIELDS if field != "_redactedFields"
            ],
            "removed_fields": list(REDACTED_ARTIST_FIELDS),
            "original_redacted_values_included": False,
            "records_with_exact_redaction_marker": len(records),
            "member_account_or_session_values_included": False,
        },
        "detail_content": {
            "included": False,
            "reason": "long_form_html_marketing_copy_and_images_excluded",
            "total_sections": content_numbers[0],
            "type_counts": content_type_counts,
        },
        "detail_image_urls": {
            "image_list_count": len(image_list_urls),
            "artwork_image_count": len(artwork_image_urls),
            "total_count": len(all_image_urls),
            "unique_count": len(set(normalized_image_urls)),
            "files_copied": False,
        },
        "records": records,
    }


def _validate_track_records(records: list[dict]) -> None:
    if len(records) != 145:
        raise BuildError("track-record count")
    if [record["sequence"] for record in records] != list(range(1, 146)):
        raise BuildError("track-record sequence")
    if [sum(record["page"] == page for record in records) for page in range(1, 16)] != EXPECTED_PAGE_COUNTS:
        raise BuildError("track-record pagination")
    if len({record["list"]["goodsId"] for record in records}) != 145:
        raise BuildError("goodsId uniqueness")
    if len({record["list"]["goodsCoPurchaseId"] for record in records}) != 145:
        raise BuildError("goodsCoPurchaseId uniqueness")
    status_counts = Counter(
        (record["list"]["coPurchaseStatusCategory"], record["list"]["coPurchaseStatus"])
        for record in records
    )
    if dict(status_counts) != EXPECTED_STATUS_COUNTS:
        raise BuildError("status distribution")

    for record in records:
        sequence = record["sequence"]
        list_record = record["list"]
        detail = record["detail"]
        artist = detail["artwork"]["artist"]
        comparisons = (
            (detail["name"], list_record["goodsName"], "name"),
            (detail["investBeginDateTime"], list_record["investBeginDateTime"], "start"),
            (detail["investEndDateTime"], list_record["investEndDateTime"], "end"),
            (detail["saleYieldPercent"], list_record["saleYieldPercent"], "yield"),
            (detail["statusCategoryCode"], list_record["coPurchaseStatusCategory"], "category"),
            (detail["status"], list_record["coPurchaseStatus"], "status"),
            (artist["artistNameForKorean"], list_record["artistNameForKorean"], "artist ko"),
            (artist["artistNameForEnglish"], list_record["artistNameForEnglish"], "artist en"),
        )
        for left, right, label in comparisons:
            if left != right:
                raise BuildError(f"cross-record {label} {sequence}")
        if list_record["representativeGoodsImageUrl"] not in detail["imageList"]["list"]:
            raise BuildError(f"representative image {sequence}")


def parse_suitability_test(source_text: str) -> dict:
    collected_at = _parse_time_range(
        source_text,
        r"^- 조회 시점 : (.+?) \(",
        "suitability timestamp",
    )
    reference_links = _extract_reference_links(source_text)
    required_links = {"공개 페이지", "문항 번들", "공통 API 번들"}
    if set(reference_links) != required_links:
        raise BuildError("suitability reference links")

    count_match = _require(
        r"\[팩트\] 총 (\d+)개 문항이며, 각 문항에는 선택지 (\d+)개가 있다\.",
        source_text,
        "question counts",
    )
    question_count, options_per_question = map(int, count_match.groups())
    validity_years = int(
        _require(
            r"\[팩트\] 화면은 테스트 결과가 (\d+)년 동안 유효하다고 안내한다\.",
            source_text,
            "validity years",
        ).group(1)
    )

    questions: list[dict] = []
    for line in source_text.splitlines():
        if not re.match(r"^\| [A-J] \|", line):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) != 6:
            raise BuildError(f"question table columns: {line}")
        label, question, option_a, option_b, correct_option_text, evidence = cells
        index = ord(label) - ord("A") + 1
        correct_option = int(correct_option_text)
        if "2026-08-10" not in evidence or "[문항 번들]" not in evidence:
            raise BuildError(f"question evidence {label}")
        questions.append(
            {
                "index": index,
                "source_label": label,
                "question": question,
                "options": [option_a, option_b],
                "correct_option": correct_option,
            }
        )

    answer_sequence_text = _require(
        r"정답 선택 번호의 순서는 `([\d, ]+)`다\.",
        source_text,
        "answer sequence",
    ).group(1)
    answer_sequence = [int(value.strip()) for value in answer_sequence_text.split(",")]

    api_calls = []
    for match in re.finditer(
        r"^- ([^:]+) : `(GET|PUT) ([^`]+)`(?: .*)?$", source_text, re.MULTILINE
    ):
        purpose, method, path = match.groups()
        api_calls.append(
            {
                "purpose": purpose.strip(),
                "method": method,
                "path": path,
                "mutates_state": method != "GET",
                "called_during_collection": False,
                "personal_value_included": False,
            }
        )

    inferences = re.findall(r"^\[추론입니다\] (.+)$", source_text, re.MULTILINE)
    _require_text(source_text, "숫자 점수 합산, 구간별 등급, 위험성향 유형 분류 로직은", "no scoring")
    _require_text(source_text, "오답 상태에는 다시 확인하라는 안내가 표시", "wrong-answer behavior")
    _require_text(
        source_text,
        "정답을 고른 직후에는 남은 첫 미응답 또는 오답 문항으로 화면이 이동",
        "question scroll behavior",
    )
    _require_text(source_text, "초기 상태에서는 선택된 답이 없고 제출 버튼이 비활성화", "initial state")
    _require_text(source_text, "요청 본문 없이 호출", "completion request body")
    _require_text(source_text, "개인별 만기일 값은 인증 회원정보에서 읽으므로 수집하거나 적지 않았다", "expiry redaction")
    success_modal_text = (
        "이제 청약이 가능합니다!",
        "투자계약증권 적합성 테스트를 모두 완료하셨습니다.",
        "만기 예정일자",
        "청약 상품 바로가기",
    )
    for index, text in enumerate(success_modal_text, start=1):
        _require_text(source_text, f"`{text}`", f"success modal text {index}")

    if question_count != 10 or options_per_question != 2 or validity_years != 2:
        raise BuildError("suitability metadata")
    if len(questions) != question_count:
        raise BuildError("suitability question count")
    if [question["index"] for question in questions] != list(range(1, 11)):
        raise BuildError("suitability question order")
    if any(len(question["options"]) != options_per_question for question in questions):
        raise BuildError("suitability option count")
    if [question["correct_option"] for question in questions] != answer_sequence:
        raise BuildError("suitability answer table mismatch")
    if answer_sequence != EXPECTED_ANSWER_SEQUENCE:
        raise BuildError("suitability answer sequence")
    expected_api_calls = {
        ("GET", "/api/public/signed-in"),
        ("PUT", "/api/public/invest-tendency"),
        ("GET", "/api/public/v2/member/invest/investor-info"),
        ("GET", "/api/public/invest-tendency-if-exists"),
    }
    if {(call["method"], call["path"]) for call in api_calls} != expected_api_calls:
        raise BuildError("suitability API flow")

    return {
        "title": "투자계약증권 적합성 테스트",
        "collected_at": collected_at,
        "question_source": "static_first_party_client_bundle",
        "question_count": question_count,
        "options_per_question": options_per_question,
        "answer_numbering": "one_based",
        "client_answer_index_numbering": "zero_based",
        "validity_years": validity_years,
        "questions": questions,
        "behavior": {
            "requires_all_correct": True,
            "numeric_score_calculation": False,
            "risk_profile_classification": False,
            "client_side_answer_comparison": True,
            "initial_answers_selected": False,
            "initial_submit_enabled": False,
            "wrong_answer_feedback": True,
            "scrolls_to_first_unanswered_or_wrong": True,
            "scroll_trigger": "immediately_after_correct_answer",
            "server_side_answer_revalidation": "unconfirmed",
        },
        "api_flow": {
            "calls": api_calls,
            "completion_request_body": None,
            "write_request_invoked_during_collection": False,
            "authenticated_member_queries_invoked_during_collection": False,
        },
        "success_and_failure_ui": {
            "success_shows_subscription_available": True,
            "success_shows_expiry_label": True,
            "success_modal_text": list(success_modal_text),
            "success_link": "/goods/subscription/list",
            "personal_expiry_value_included": False,
            "failure_alert_present": True,
        },
        "privacy": {
            "member_identifier_included": False,
            "account_information_included": False,
            "session_value_included": False,
            "personal_answers_included": False,
            "personal_result_included": False,
            "personal_expiry_value_included": False,
        },
        "inferences": inferences,
        "sources": {
            "page": reference_links["공개 페이지"],
            "question_bundle": reference_links["문항 번들"],
            "api_bundle": reference_links["공통 API 번들"],
        },
    }


def _source_bytes(path: Path, source_text: str | None) -> bytes:
    return path.read_bytes() if source_text is None else source_text.encode("utf-8")


def _all_urls(value) -> list[str]:
    urls: list[str] = []
    if isinstance(value, dict):
        for nested in value.values():
            urls.extend(_all_urls(nested))
    elif isinstance(value, list):
        for nested in value:
            urls.extend(_all_urls(nested))
    elif isinstance(value, str) and value.strip().startswith("https://"):
        urls.append(value.strip())
    return urls


def build_payload(
    track_source_text: str | None = None,
    suitability_source_text: str | None = None,
) -> dict:
    track_bytes = _source_bytes(TRACK_SOURCE, track_source_text)
    suitability_bytes = _source_bytes(SUITABILITY_SOURCE, suitability_source_text)
    track_text = track_bytes.decode("utf-8")
    suitability_text = suitability_bytes.decode("utf-8")

    track_records = parse_track_records(track_text)
    suitability_test = parse_suitability_test(suitability_text)
    if track_records["collected_at"] != suitability_test["collected_at"]:
        raise BuildError("source timestamp mismatch")

    source_documents = [
        {
            "path": "deliverables/weshareart_co_purchase_track_records_2026-08-10.md",
            "role": "track_records_evidence",
            "sha256": hashlib.sha256(track_bytes).hexdigest(),
        },
        {
            "path": "deliverables/weshareart_investment_contract_securities_suitability_test_2026-08-10.md",
            "role": "suitability_test_evidence",
            "sha256": hashlib.sha256(suitability_bytes).hexdigest(),
        },
    ]
    sources = [
        {
            "id": "co-purchase-page",
            "label": "아트투게더 지난 공동구매",
            "url": track_records["sources"]["track_page"],
            "role": "public_page",
        },
        {
            "id": "co-purchase-list-api",
            "label": "지난 공동구매 목록 first-party API",
            "url": track_records["sources"]["all_records_api"],
            "role": "record_source",
        },
        {
            "id": "co-purchase-status-enum-api",
            "label": "공동구매 상태 enum first-party API",
            "url": track_records["sources"]["status_enum_api"],
            "role": "status_mapping_source",
        },
        {
            "id": "suitability-page",
            "label": "투자계약증권 적합성 테스트",
            "url": suitability_test["sources"]["page"],
            "role": "public_page",
        },
        {
            "id": "suitability-question-bundle",
            "label": "적합성 테스트 문항 first-party JavaScript",
            "url": suitability_test["sources"]["question_bundle"],
            "role": "question_and_answer_source",
        },
        {
            "id": "weshareart-api-bundle",
            "label": "아트투게더 공통 API first-party JavaScript",
            "url": suitability_test["sources"]["api_bundle"],
            "role": "api_behavior_source",
        },
    ]
    for source in sources:
        _validate_url(source["url"], source["id"])

    payload = {
        "schema_version": "1.0.0",
        "dataset": {
            "id": "weshareart-research-2026-08-10",
            "title": "아트투게더 지난 공동구매 및 투자계약증권 적합성 테스트",
            "kind": "service_platform_self_reported_research_snapshot",
            "mode": "verified_snapshot",
            "collected_at": track_records["collected_at"],
            "as_of": track_records["collected_at"]["to"],
            "record_count": len(track_records["records"]),
            "page_count": track_records["source_pagination"]["total_pages"],
            "suitability_question_count": suitability_test["question_count"],
            "source_documents": source_documents,
            "independent_verification_status": "not_performed",
            "api_documentation_status": "not_confirmed",
        },
        "sources": sources,
        "track_records": track_records,
        "suitability_test": suitability_test,
        "limitations": [
            "플랫폼이 자체 게시한 트랙레코드이며 매각 계약서, 경매 낙찰 결과, 입금·분배 내역을 외부 원자료로 독립 검증하지 않았습니다.",
            "first-party endpoint가 외부 개발자용 공개 API로 문서화됐는지는 확인되지 않았습니다.",
            "모집일시 문자열에는 timezone offset이 없어 UTC 또는 KST로 임의 변환하지 않습니다.",
            "금액형 상세 필드에는 currency code가 없어 통화 단위를 임의로 붙이지 않습니다.",
            "로그인이 필요한 매각 상세와 회원별 적합성 상태는 수집하지 않았습니다.",
            "장문 상세 HTML, 마케팅 문구와 이미지 파일은 데이터셋에 복제하지 않았습니다.",
            "적합성 테스트 정답은 client JavaScript 값이며 각 선택지의 법적 타당성을 독립 검증한 결과가 아닙니다.",
            "적합성 완료 요청에 대한 서버 측 정답 재검증 방식은 확인되지 않았습니다.",
        ],
        "validation": {
            "source_documents_parsed": True,
            "source_order_preserved": True,
            "record_count": len(track_records["records"]),
            "page_count": track_records["source_pagination"]["total_pages"],
            "page_counts": EXPECTED_PAGE_COUNTS,
            "unique_goods_ids": len(
                {record["list"]["goodsId"] for record in track_records["records"]}
            ),
            "unique_goods_co_purchase_ids": len(
                {
                    record["list"]["goodsCoPurchaseId"]
                    for record in track_records["records"]
                }
            ),
            "duplicate_ids": 0,
            "all_records_have_18_list_fields": True,
            "all_records_have_redacted_detail": True,
            "list_detail_cross_checks_match": True,
            "null_empty_whitespace_zero_preserved": True,
            "timezone_unspecified_datetime_preserved": True,
            "suitability_question_count": suitability_test["question_count"],
            "suitability_correct_answer_sequence_preserved": True,
            "personal_member_values_included": False,
            "utm_parameters_present": False,
            "image_files_copied": False,
            "long_form_html_copied": False,
            "network_used": False,
            "system_temp_directory_used": False,
        },
    }
    validate(payload)
    return payload


def validate(payload: dict) -> None:
    records = payload["track_records"]["records"]
    _validate_track_records(records)
    if payload["dataset"]["record_count"] != 145 or payload["dataset"]["page_count"] != 15:
        raise BuildError("dataset counts")
    if payload["track_records"]["detail_image_urls"] != {
        "image_list_count": 400,
        "artwork_image_count": 145,
        "total_count": 545,
        "unique_count": 545,
        "files_copied": False,
    }:
        raise BuildError("detail image count")
    if payload["track_records"]["detail_content"] != {
        "included": False,
        "reason": "long_form_html_marketing_copy_and_images_excluded",
        "total_sections": 1071,
        "type_counts": {
            "ARTWORK_INFO": 145,
            "ART_DIRECTOR": 154,
            "GOODS_NEWS": 344,
            "INVEST": 398,
            "SUMMARY": 30,
        },
    }:
        raise BuildError("detail content metadata")
    if payload["track_records"]["distributions"]["saleYieldPercent"] != {
        "min": 0,
        "max": 161.19,
        "positive": 52,
        "zero": 93,
        "negative": 0,
    }:
        raise BuildError("sale yield distribution")
    if payload["track_records"]["distributions"]["goodsDetail"] != {
        "true": 128,
        "false": 17,
    }:
        raise BuildError("goods detail distribution")

    suitability = payload["suitability_test"]
    if [question["correct_option"] for question in suitability["questions"]] != EXPECTED_ANSWER_SEQUENCE:
        raise BuildError("suitability answers")
    if suitability["privacy"] != {
        "member_identifier_included": False,
        "account_information_included": False,
        "session_value_included": False,
        "personal_answers_included": False,
        "personal_result_included": False,
        "personal_expiry_value_included": False,
    }:
        raise BuildError("suitability privacy")

    for index, url in enumerate(_all_urls(payload), start=1):
        _validate_url(url, f"payload URL {index}")
    serialized = json.dumps(payload, ensure_ascii=False)
    forbidden_values = (
        "JSESSIONID",
        "Set-Cookie",
        "Authorization: Bearer",
        '"memberInfo"',
        '"expiredDate"',
        "data:image/",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
    )
    for forbidden in forbidden_values:
        if forbidden.lower() in serialized.lower():
            raise BuildError(f"forbidden value: {forbidden}")


def serialise(payload: dict) -> bytes:
    return (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def write(payload: dict, output: Path = OUTPUT) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            prefix=".weshareart-research-", dir=output.parent, delete=False
        ) as handle:
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
            raise BuildError("checked-in JSON differs from source documents")
    else:
        write(payload)
    print(
        "PASS: WeShareArt research "
        f"{len(payload['track_records']['records'])} records / "
        f"{len(payload['suitability_test']['questions'])} questions"
    )


if __name__ == "__main__":
    main()
