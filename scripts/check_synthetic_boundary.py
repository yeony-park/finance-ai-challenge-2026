#!/usr/bin/env python3
"""Check that deployable sources and artifacts stay on the synthetic boundary.

Usage::

    python3 scripts/check_synthetic_boundary.py --mode source
    python3 scripts/check_synthetic_boundary.py --mode artifact live .next/standalone

Source mode follows the repository's deployable allowlist and deliberately
never walks archive, raw, test, or documentation directories.  Artifact mode
scans only paths supplied on the command line (or the small in-repository
post-build defaults).  OpenDART hosts are explicitly allowlisted because the
filing manifest is an approved server-side input.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Iterable, Iterator
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).resolve()

# These are source snapshots or names from the retired data adapters.  A file
# with one of these names is rejected even when it is not JSON.
FORBIDDEN_FILENAMES = frozenset(
    {
        "products.json",
        "issuers.json",
        "artnguide_track_records.json",
        "weshareart_research.json",
        "tessa_sale_records.json",
        "artnguide_due_diligence.json",
        "artnguide_evidence_sources.json",
    }
)

# API-specific keys are not valid in the synthetic fixture.  Keep generic
# fields such as title, status, and artistId out of this list.
FORBIDDEN_PAYLOAD_FIELDS = frozenset(
    {
        "goodsId",
        "goodsName",
        "goodsCoPurchaseId",
        "coPurchaseStatus",
        "coPurchaseStatusCategory",
        "investBeginDateTime",
        "investEndDateTime",
        "keepingDays",
        "availableQuantity",
        "purchasedQuantity",
        "purchasedPercent",
        "representativeGoodsImageUrl",
        "artistNameForKorean",
        "artistNameForEnglish",
        "titleForKorean",
        "titleForEnglish",
        "disclosure_id",
        "disclosure_url",
        "source_url",
        "source_urls",
        "soldMoney",
        "soldTime",
        "dateHold",
        "gpMoney",
        "totalGpMoney",
        "totalGpTransferedMoney",
        "authorName",
        "artMaterial",
        "artSize",
        "salePrice",
        "sale_price",
        "final_sale_amount_krw",
        "source_reported_return_pct",
        "sourcePayload",
        "dueDiligencePayload",
        "sourceSnapshot",
        "legacySourceRef",
    }
)

# Names and identifiers are checked separately from domains.  These markers
# catch a renamed JSON file or a platform ID that does not contain a URL.
FORBIDDEN_PLATFORM_MARKERS = frozenset(
    {
        "artnguide",
        "art n guide",
        "art앤가이드",
        "아트앤가이드",
        "weshareart",
        "we share art",
        "아트투게더",
        "arttogether",
        "tessa",
        "platform-artnguide",
        "platform-arttogether",
        "platform-tessa",
        "issuer-togetherart",
        "legacy-platform-artnguide",
        "legacy-platform-arttogether",
        "legacy-platform-tessa",
    }
)

# Platform, raw source, and artist-site hosts that must never enter a
# deployable artifact.  Domain matching is case-insensitive and supports
# subdomains.  OpenDART is handled separately below.
FORBIDDEN_DOMAINS = frozenset(
    {
        "artnguide.co.kr",
        "weshareart.com",
        "tessa.art",
        "artprice.kr",
        "cloudfront.net",
        "christies.com",
        "mmca.go.kr",
        "whankimuseum.org",
        "damienhirst.com",
        "davidshrigley.com",
        "hockney.com",
        "marcchagall.com",
        "parkseobo.com",
        "parksookeun.or.kr",
        "kimtschang-yeul.jeju.go.kr",
    }
)
OPEN_DART_HOSTS = frozenset(
    {
        "dart.fss.or.kr",
        "englishdart.fss.or.kr",
        "opendart.fss.or.kr",
        "api.odcloud.kr",
    }
)
PRIVATE_DIRECTORY_NAMES = frozenset(
    {".git", "node_modules", "archive", "archives", "raw", "deliverables", "docs", "tests", "tmp", "_workspace"}
)
SOURCE_PATHS = (
    "app",
    "components",
    "lib",
    "public",
    "styles",
    "js",
    "index.html",
    "search.html",
    "suitability.html",
    "styles.css",
    "server.py",
    "Dockerfile",
    ".dockerignore",
    "docker-compose.yml",
    "next.config.ts",
    "next-env.d.ts",
    "tsconfig.json",
    "package.json",
    "package-lock.json",
    "data/synthetic",
    "data/art/dart-filing-manifest.json",
    "scripts/build_live_static.py",
)
DEFAULT_ARTIFACT_PATHS = ("live", ".next/standalone", ".next/static")

FIELD_PATTERNS = tuple(
    (field, re.compile(rf"(?<![A-Za-z0-9_]){re.escape(field)}(?![A-Za-z0-9_])"))
    for field in sorted(FORBIDDEN_PAYLOAD_FIELDS, key=len, reverse=True)
)
FILENAME_PATTERNS = tuple(
    (name, re.compile(rf"(?<![A-Za-z0-9_.-]){re.escape(name)}(?![A-Za-z0-9_.-])", re.IGNORECASE))
    for name in sorted(FORBIDDEN_FILENAMES, key=len, reverse=True)
)
PLATFORM_MARKER_PATTERNS = tuple(
    (marker, re.compile(rf"(?<![A-Za-z0-9_-]){re.escape(marker)}(?![A-Za-z0-9_-])", re.IGNORECASE))
    for marker in sorted(FORBIDDEN_PLATFORM_MARKERS, key=len, reverse=True)
)
DOMAIN_PATTERN = re.compile(
    r"(?<![A-Za-z0-9.-])(?:https?://|//)?([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)(?![A-Za-z0-9.-])",
    re.IGNORECASE,
)
URL_PATTERN = re.compile(r'''(?i)(?:https?:)?//[^\s'"<>]+''')


def _is_open_dart_host(host: str, allowed: set[str]) -> bool:
    host = host.lower().rstrip(".")
    return any(host == item or host.endswith("." + item) for item in allowed)


def _configured_canaries(values: Iterable[str]) -> tuple[str, ...]:
    configured = list(values)
    for env_name in ("SYNTHETIC_CANARIES", "SYNTHETIC_BOUNDARY_CANARIES"):
        configured.extend(re.split(r"[,;\n]", os.environ.get(env_name, "")))
    return tuple(dict.fromkeys(item.strip() for item in configured if item.strip()))


def _is_private_path(path: Path) -> bool:
    return any(part in PRIVATE_DIRECTORY_NAMES for part in path.parts)


def _iter_files(path: Path) -> Iterator[Path]:
    if _is_private_path(path):
        return
    if path.is_symlink():
        yield path
        return
    if path.is_file():
        yield path
        return
    if not path.is_dir():
        return
    for child in sorted(path.iterdir()):
        if _is_private_path(child):
            continue
        if child.is_symlink() or child.is_file():
            yield child
        elif child.is_dir():
            yield from _iter_files(child)


def _source_files(root: Path) -> Iterator[Path]:
    for relative in SOURCE_PATHS:
        candidate = root / relative
        if candidate.is_dir() and not candidate.is_symlink():
            yield from _iter_files(candidate)
        elif candidate.exists() or candidate.is_symlink():
            yield candidate


def _artifact_files(root: Path, requested: Iterable[str]) -> tuple[list[Path], list[str]]:
    files: list[Path] = []
    errors: list[str] = []
    for raw_path in requested:
        path = Path(raw_path)
        if not path.is_absolute():
            path = root / path
        path = path.resolve(strict=False)
        if _is_private_path(path):
            errors.append(f"private path is not an artifact: {raw_path}")
            continue
        if not path.exists() and not path.is_symlink():
            errors.append(f"artifact path missing: {raw_path}")
            continue
        files.extend(_iter_files(path))
    return files, errors


def _allowlisted_manifest(path: Path, root: Path) -> bool:
    try:
        return path.resolve(strict=False) == (root / "data/art/dart-filing-manifest.json").resolve(strict=False)
    except OSError:
        return False


def _read_text(path: Path) -> str | None:
    try:
        raw = path.read_bytes()
    except OSError as error:
        return f"<unreadable: {error}>"
    if b"\x00" in raw:
        return None
    return raw.decode("utf-8", errors="replace")


def scan_file(path: Path, root: Path, canaries: tuple[str, ...], open_dart_hosts: set[str]) -> list[str]:
    if path.resolve(strict=False) == SCRIPT:
        return []
    findings: list[str] = []
    name = path.name.lower()
    if name in FORBIDDEN_FILENAMES:
        findings.append(f"forbidden filename: {path}")
    if path.is_symlink():
        findings.append(f"symlink artifact: {path}")
        return findings
    text = _read_text(path)
    if text is None:
        return findings
    if text.startswith("<unreadable:"):
        findings.append(f"{path}: {text}")
        return findings
    # The approved manifest contains lineage text referring to the retired
    # input name.  Its path is allowlisted as an OpenDART control-plane file;
    # all other files are checked normally.
    allow_manifest = _allowlisted_manifest(path, root)
    # Next bundles may inline the approved OpenDART manifest.  Keep the
    # allowlist narrow: only that manifest marker may carry its historical
    # generatedFrom filename into an artifact.
    allow_manifest_bundle = "dart-filing-manifest-v1" in text
    allow_dockerignore = path.resolve(strict=False) == (root / ".dockerignore").resolve(strict=False)
    if not allow_manifest and not allow_dockerignore:
        for forbidden_name, pattern in FILENAME_PATTERNS:
            if pattern.search(text) and not (allow_manifest_bundle and forbidden_name == "products.json"):
                findings.append(f"forbidden filename text {forbidden_name}: {path}")
        for field, pattern in FIELD_PATTERNS:
            if pattern.search(text):
                findings.append(f"forbidden payload field {field}: {path}")
        for marker, pattern in PLATFORM_MARKER_PATTERNS:
            if pattern.search(text):
                findings.append(f"forbidden platform marker {marker}: {path}")
    for match in DOMAIN_PATTERN.finditer(text):
        host = match.group(1).lower().rstrip(".")
        if _is_open_dart_host(host, open_dart_hosts):
            continue
        if any(host == domain or host.endswith("." + domain) for domain in FORBIDDEN_DOMAINS):
            findings.append(f"forbidden source domain {host}: {path}")
    for url in URL_PATTERN.findall(text):
        try:
            host = (urlsplit(url if url.startswith("http") else "https:" + url).hostname or "").lower()
        except ValueError:
            continue
        # Keep this explicit branch visible: OpenDART is the only approved
        # external source family for this deployment boundary.
        if _is_open_dart_host(host, open_dart_hosts):
            continue
    for canary in canaries:
        if canary.casefold() in text.casefold():
            findings.append(f"configured canary matched: {canary}: {path}")
    return findings


def scan(mode: str, root: Path, artifact_paths: Iterable[str], canaries: Iterable[str], extra_open_dart_hosts: Iterable[str]) -> list[str]:
    root = root.resolve()
    configured = _configured_canaries(canaries)
    open_dart_hosts = set(OPEN_DART_HOSTS)
    open_dart_hosts.update(host.lower().rstrip(".") for host in extra_open_dart_hosts if host.strip())
    if mode == "source":
        paths = list(_source_files(root))
        errors: list[str] = []
    else:
        requested = list(artifact_paths) or list(DEFAULT_ARTIFACT_PATHS)
        paths, errors = _artifact_files(root, requested)
    findings = list(errors)
    seen: set[Path] = set()
    for path in paths:
        resolved = path.resolve(strict=False)
        if resolved in seen:
            continue
        seen.add(resolved)
        findings.extend(scan_file(path, root, configured, open_dart_hosts))
    return list(dict.fromkeys(findings))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("source", "artifact"), default="source")
    parser.add_argument("--root", type=Path, default=ROOT, help="repository root")
    parser.add_argument("--canary", action="append", default=[], help="literal canary to reject (repeatable)")
    parser.add_argument("--allow-open-dart-host", action="append", default=[], help="additional approved OpenDART host")
    parser.add_argument("--path", dest="option_paths", action="append", default=[], help="artifact path (repeatable)")
    parser.add_argument("paths", nargs="*", help="artifact paths; used in artifact mode")
    args = parser.parse_args(argv)
    requested_paths = [*args.option_paths, *args.paths]
    if args.mode == "source" and requested_paths:
        parser.error("artifact paths require --mode artifact")
    findings = scan(args.mode, args.root, requested_paths, args.canary, args.allow_open_dart_host)
    if findings:
        print(f"FAIL: synthetic boundary ({len(findings)} finding(s))", file=sys.stderr)
        for finding in findings:
            print(f"- {finding}", file=sys.stderr)
        return 1
    print(f"PASS: synthetic boundary mode={args.mode}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
