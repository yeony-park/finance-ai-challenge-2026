#!/usr/bin/env python3
"""운영 연결 전 공식 API와 더미 데이터의 원문 응답을 격리 저장한다."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, unquote, urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
DEFAULT_CONFIG = ROOT / "config.example.json"
LOCAL_CONFIG = ROOT / "config.local.json"
ENV_FILE = ROOT / ".env.local"
FIXTURE_FILE = ROOT / "fixtures" / "dummy_products.json"
OUTPUT_ROOT = ROOT / "output"
SOURCES = ("dummy", "opendart", "legal_dong", "rtms", "building_hub", "rone", "ecos")


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as file:
        value = json.load(file)
    if not isinstance(value, dict):
        raise ValueError(f"JSON 최상위 값은 객체여야 합니다: {path}")
    return value


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"{name}이 없습니다. test_scripts/.env.local에 입력하세요.")
    return value


def required_fields(config: dict[str, Any], source: str, fields: tuple[str, ...]) -> dict[str, Any]:
    values = config.get(source)
    if not isinstance(values, dict):
        raise ValueError(f"설정에 {source} 객체가 없습니다.")
    missing = [field for field in fields if values.get(field) in (None, "")]
    if missing:
        raise ValueError(f"{source} 필수 설정이 없습니다: {', '.join(missing)}")
    return values


def build_request(source: str, config: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    if source == "opendart":
        params = required_fields(config, source, ("bgn_de", "end_de", "page_count")) | {
            "crtfc_key": required_env("OPENDART_API_KEY")
        }
        return "https://opendart.fss.or.kr/api/list.json", params

    if source == "rtms":
        params = required_fields(config, source, ("LAWD_CD", "DEAL_YMD", "numOfRows", "pageNo")) | {
            "serviceKey": unquote(required_env("RTMS_API_KEY"))
        }
        return "https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade", params

    if source == "legal_dong":
        params = required_fields(config, source, ("pageNo", "numOfRows", "type")) | {
            "ServiceKey": unquote(required_env("LEGAL_DONG_API_KEY"))
        }
        return "https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList", params

    if source == "building_hub":
        params = required_fields(config, source, ("sigunguCd", "bjdongCd", "numOfRows", "pageNo")) | {
            "serviceKey": unquote(required_env("BUILDING_HUB_API_KEY"))
        }
        return "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo", params

    if source == "rone":
        params = required_fields(
            config,
            source,
            ("STATBL_ID", "DTACYCLE_CD", "WRTTIME_IDTFR_ID", "pIndex", "pSize", "Type"),
        ) | {"KEY": required_env("RONE_API_KEY")}
        return "https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do", params

    if source == "ecos":
        values = required_fields(
            config,
            source,
            ("stat_code", "cycle", "start_date", "end_date", "start_row", "end_row"),
        )
        key = quote(required_env("ECOS_API_KEY"), safe="")
        url = (
            "https://ecos.bok.or.kr/api/StatisticSearch/"
            f"{key}/json/kr/{values['start_row']}/{values['end_row']}/"
            f"{values['stat_code']}/{values['cycle']}/{values['start_date']}/{values['end_date']}/"
        )
        return url, {}

    raise ValueError(f"지원하지 않는 소스입니다: {source}")


def safe_params(params: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in params.items()
        if key.lower() not in {"key", "servicekey", "crtfc_key"}
    }


def redact_secrets(message: str) -> str:
    variants = set()
    for name in (
        "OPENDART_API_KEY",
        "LEGAL_DONG_API_KEY",
        "RTMS_API_KEY",
        "BUILDING_HUB_API_KEY",
        "RONE_API_KEY",
        "ECOS_API_KEY",
    ):
        value = os.getenv(name, "").strip()
        if value:
            variants.update((value, quote(value, safe=""), unquote(value)))
    for value in sorted(variants, key=len, reverse=True):
        message = message.replace(value, "***")
    return message


def fetch(source: str, config: dict[str, Any], timeout: int) -> dict[str, Any]:
    url, params = build_request(source, config)
    request_url = f"{url}?{urlencode(params)}" if params else url
    request = Request(request_url, headers={"User-Agent": "JeomJeom-test-scripts/1.0"})
    with urlopen(request, timeout=timeout) as response:
        body = response.read().decode(response.headers.get_content_charset() or "utf-8", errors="replace")
        return {
            "source": source,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "status_code": response.status,
            "content_type": response.headers.get("Content-Type"),
            "request_parameters": safe_params(params),
            "body": redact_secrets(body),
        }


def dummy_result() -> dict[str, Any]:
    fixture = load_json(FIXTURE_FILE)
    products = fixture.get("products")
    if not isinstance(products, list) or not products:
        raise ValueError("더미 상품 목록이 비어 있습니다.")
    if any(not isinstance(product, dict) or product.get("sample") is not True for product in products):
        raise ValueError("모든 더미 상품은 sample=true여야 합니다.")
    return {
        "source": "dummy",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "status_code": None,
        "content_type": "application/json",
        "request_parameters": {},
        "body": fixture,
    }


def write_result(run_dir: Path, source: str, result: dict[str, Any]) -> None:
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / f"{source}.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def self_check() -> None:
    assert safe_params({"KEY": "secret", "serviceKey": "secret", "pageNo": 1}) == {"pageNo": 1}
    assert dummy_result()["source"] == "dummy"
    test_keys = {
        "OPENDART_API_KEY": "sample-opendart+secret=",
        "LEGAL_DONG_API_KEY": "sample-legal-dong+secret=",
        "RTMS_API_KEY": "sample-rtms+secret=",
        "BUILDING_HUB_API_KEY": "sample-building-hub+secret=",
        "RONE_API_KEY": "sample-rone+secret=",
        "ECOS_API_KEY": "sample-ecos+secret=",
    }
    os.environ.update(test_keys)
    try:
        for value in test_keys.values():
            assert redact_secrets(quote(value, safe="")) == "***"
        config = load_json(DEFAULT_CONFIG)
        expected = {
            "opendart": ("https://opendart.fss.or.kr/api/list.json", "crtfc_key", "OPENDART_API_KEY"),
            "legal_dong": ("https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList", "ServiceKey", "LEGAL_DONG_API_KEY"),
            "rtms": ("https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade", "serviceKey", "RTMS_API_KEY"),
            "building_hub": ("https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo", "serviceKey", "BUILDING_HUB_API_KEY"),
            "rone": ("https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do", "KEY", "RONE_API_KEY"),
        }
        for source, (expected_url, auth_field, env_name) in expected.items():
            url, params = build_request(source, config)
            assert url == expected_url
            assert params[auth_field] == test_keys[env_name]
            assert auth_field not in safe_params(params)
        ecos_url, ecos_params = build_request("ecos", config)
        assert ecos_url.startswith("https://ecos.bok.or.kr/api/StatisticSearch/")
        assert quote(test_keys["ECOS_API_KEY"], safe="") in ecos_url
        assert ecos_params == {}
    finally:
        for name in test_keys:
            os.environ.pop(name, None)
    print("self-check 통과")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", choices=("all", *SOURCES), default="all")
    parser.add_argument("--config", type=Path)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--self-check", action="store_true", help="네트워크 없이 코드와 더미 데이터만 확인")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.self_check:
        self_check()
        return 0

    load_env_file(ENV_FILE)
    config_path = args.config or (LOCAL_CONFIG if LOCAL_CONFIG.exists() else DEFAULT_CONFIG)
    config = load_json(config_path)
    selected = SOURCES if args.source == "all" else (args.source,)
    run_dir = OUTPUT_ROOT / datetime.now().strftime("%Y%m%d-%H%M%S")
    failed = False

    for source in selected:
        try:
            result = dummy_result() if source == "dummy" else fetch(source, config, args.timeout)
            print(f"[RECEIVED] {source}")
        except (ValueError, OSError, HTTPError, URLError, json.JSONDecodeError) as error:
            failed = True
            message = redact_secrets(str(error))
            result = {
                "source": source,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "error": type(error).__name__,
                "message": message,
            }
            print(f"[FAIL] {source}: {message}", file=sys.stderr)
        write_result(run_dir, source, result)

    print(f"결과 위치: {run_dir}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
