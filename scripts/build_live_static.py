#!/usr/bin/env python3
"""Build a clean, synthetic-only static document root.

The output is an allowlisted copy of the static shell and the synthetic
fixture. It never reads, serves, or preserves other repository data.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
DATA_SOURCE = PurePosixPath("data/synthetic/art-investment.json")
HISTORY_SOURCE_DIR = PurePosixPath("public/synthetic-art/history")
HISTORY_TARGET_DIR = PurePosixPath("synthetic-art/history")
HISTORY_RECORD_COUNT = 318
SVG_NAMESPACE = "http://www.w3.org/2000/svg"
SVG_TAG = f"{{{SVG_NAMESPACE}}}svg"
HISTORY_TAGS = frozenset(
    {"svg", "title", "rect", "circle", "ellipse", "g", "line", "path", "polygon", "text"}
)
HISTORY_ATTRIBUTES = frozenset(
    {
        "aria-label",
        "cx",
        "cy",
        "data-index",
        "data-record-id",
        "data-record-index",
        "data-seed",
        "d",
        "fill",
        "fill-opacity",
        "font-family",
        "font-size",
        "height",
        "letter-spacing",
        "opacity",
        "points",
        "r",
        "role",
        "rx",
        "ry",
        "stroke",
        "stroke-linecap",
        "stroke-dasharray",
        "stroke-linejoin",
        "stroke-opacity",
        "stroke-width",
        "text-anchor",
        "transform",
        "viewBox",
        "width",
        "x",
        "x1",
        "x2",
        "y",
        "y1",
        "y2",
    }
)
EXTERNAL_REFERENCE_RE = re.compile(r"(?i)(?:https?:|data:|file:|ftp:|javascript:|//|url\s*\()")
# Paint values are the only history presentation values that can load a
# resource. Keep them to the forms used by the fixtures instead of trying to
# blacklist every CSS spelling of url().
SAFE_PAINT_RE = re.compile(
    r"\A(?:none|#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8}))\Z"
)
PRESENTATION_ATTRIBUTES = frozenset(
    {
        "fill",
        "fill-opacity",
        "font-family",
        "font-size",
        "letter-spacing",
        "opacity",
        "stroke",
        "stroke-linecap",
        "stroke-dasharray",
        "stroke-linejoin",
        "stroke-opacity",
        "stroke-width",
        "text-anchor",
        "transform",
    }
)
SAFE_NUMBER_RE = re.compile(r"\A-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?\Z")
SAFE_OPACITY_RE = re.compile(r"\A(?:0|1|0?\.[0-9]+)\Z")
SAFE_DASHARRAY_RE = re.compile(
    r"\A-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:\s+-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?)*\Z"
)
SAFE_TRANSFORM_RE = re.compile(
    r"\Arotate\(-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?\s+-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?\s+-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?\)\Z"
)
PRESENTATION_VALUE_RE = {
    "fill": SAFE_PAINT_RE,
    "stroke": SAFE_PAINT_RE,
    "fill-opacity": SAFE_OPACITY_RE,
    "stroke-opacity": SAFE_OPACITY_RE,
    "opacity": SAFE_OPACITY_RE,
    "font-family": re.compile(r"\Asans-serif\Z"),
    "font-size": SAFE_NUMBER_RE,
    "letter-spacing": SAFE_NUMBER_RE,
    "stroke-width": SAFE_NUMBER_RE,
    "stroke-linecap": re.compile(r"\Around\Z"),
    "stroke-linejoin": re.compile(r"\Around\Z"),
    "stroke-dasharray": SAFE_DASHARRAY_RE,
    "text-anchor": re.compile(r"\A(?:end|middle)\Z"),
    "transform": SAFE_TRANSFORM_RE,
}
SAFE_RECORD_ID_RE = re.compile(r"synthetic-[A-Za-z0-9][A-Za-z0-9._-]*\Z")
CURRENT_SOURCE_MAP = (
    (PurePosixPath("index.html"), PurePosixPath("index.html")),
    (PurePosixPath("search.html"), PurePosixPath("search.html")),
    (PurePosixPath("suitability.html"), PurePosixPath("suitability.html")),
    (PurePosixPath("styles.css"), PurePosixPath("styles.css")),
    (PurePosixPath("js/app.js"), PurePosixPath("js/app.js")),
    (PurePosixPath("js/api.js"), PurePosixPath("js/api.js")),
    (DATA_SOURCE, DATA_SOURCE),
    *((
        PurePosixPath(f"public/synthetic-art/synthetic-artwork-{index:02d}.svg"),
        PurePosixPath(f"synthetic-art/synthetic-artwork-{index:02d}.svg"),
    ) for index in range(1, 10)),
)


class BuildError(RuntimeError):
    pass


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def reject_symlink_chain(root: Path, relative: PurePosixPath, label: str) -> Path:
    current = root
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            raise BuildError(f"{label} symlink rejected: {relative}")
    return current


def _load_data(root: Path) -> dict:
    data_path = reject_symlink_chain(root, DATA_SOURCE, "source")
    if not data_path.is_file():
        raise BuildError(f"source missing: {DATA_SOURCE}")
    try:
        data = json.loads(data_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise BuildError(f"synthetic data is not valid JSON: {error}") from error
    if not isinstance(data, dict):
        raise BuildError("synthetic data root must be an object")
    return data


def history_source_map(root: Path) -> tuple[tuple[PurePosixPath, PurePosixPath], ...]:
    """Derive every historical artwork path from the synthetic fixture."""
    records = _load_data(root).get("trackRecords")
    if not isinstance(records, list) or len(records) != HISTORY_RECORD_COUNT:
        actual = len(records) if isinstance(records, list) else "not a list"
        raise BuildError(f"expected {HISTORY_RECORD_COUNT} synthetic track records, got {actual}")

    mappings: list[tuple[PurePosixPath, PurePosixPath]] = []
    seen_ids: set[str] = set()
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            raise BuildError(f"track record {index} is not an object")
        record_id = record.get("id")
        if not isinstance(record_id, str) or not SAFE_RECORD_ID_RE.fullmatch(record_id):
            raise BuildError(f"unsafe synthetic track record id at index {index}: {record_id!r}")
        if record_id in seen_ids:
            raise BuildError(f"duplicate synthetic track record id: {record_id}")
        seen_ids.add(record_id)
        expected_url = f"/synthetic-art/history/{record_id}.svg"
        if record.get("artworkImageUrl") != expected_url:
            raise BuildError(
                f"track record {record_id} must use artworkImageUrl {expected_url!r}"
            )
        filename = f"{record_id}.svg"
        mappings.append((HISTORY_SOURCE_DIR / filename, HISTORY_TARGET_DIR / filename))
    return tuple(mappings)


def source_map(root: Path = ROOT) -> tuple[tuple[PurePosixPath, PurePosixPath], ...]:
    return (*CURRENT_SOURCE_MAP, *history_source_map(Path(os.path.abspath(root))))


def _history_inventory(root: Path, mappings: tuple[tuple[PurePosixPath, PurePosixPath], ...]) -> None:
    history_dir = reject_symlink_chain(root, HISTORY_SOURCE_DIR, "source")
    if not history_dir.is_dir():
        raise BuildError(f"source missing: {HISTORY_SOURCE_DIR}")
    files, dirs = scan_tree(history_dir)
    expected = {source.relative_to(HISTORY_SOURCE_DIR) for source, _ in mappings}
    if files != expected or dirs:
        extras = sorted(map(str, (files - expected) | dirs))
        missing = sorted(map(str, expected - files))
        detail = [f"extra: {', '.join(extras)}"] if extras else []
        if missing:
            detail.append(f"missing: {', '.join(missing)}")
        raise BuildError("synthetic history source inventory does not exactly match fixture (" + "; ".join(detail) + ")")


def _validate_history_svg(data: bytes, label: PurePosixPath | str) -> None:
    try:
        text = data.decode("utf-8")
        root = ET.fromstring(data)
    except (UnicodeDecodeError, ET.ParseError) as error:
        raise BuildError(f"history SVG is not valid XML: {label}") from error
    if "\x00" in text or "<!" in text or "<?" in text:
        raise BuildError(f"history SVG contains a forbidden XML construct: {label}")
    # The SVG namespace is the one permitted URI. Remove only its declaration
    # before looking for external references in the raw document.
    without_namespace = re.sub(
        r'''xmlns\s*=\s*(['"])''' + re.escape(SVG_NAMESPACE) + r'''\1''',
        "",
        text,
        flags=re.IGNORECASE,
    )
    if EXTERNAL_REFERENCE_RE.search(without_namespace):
        raise BuildError(f"history SVG contains an external reference: {label}")
    if "\\" in text:
        raise BuildError(f"history SVG contains a forbidden CSS escape: {label}")
    if text.count("SYNTHETIC") != 1 or sum((element.text or "").strip() == "SYNTHETIC" for element in root.iter()) != 1:
        raise BuildError(f"history SVG must contain exactly one SYNTHETIC marker: {label}")
    if root.tag != SVG_TAG or root.attrib.get("viewBox") != "0 0 800 1000":
        raise BuildError(f"history SVG has an invalid root or viewBox: {label}")

    for element in root.iter():
        if not isinstance(element.tag, str) or element.tag.rsplit("}", 1)[-1] not in HISTORY_TAGS:
            raise BuildError(f"history SVG has a forbidden element: {label}")
        if element.tag != SVG_TAG and not element.tag.startswith("{" + SVG_NAMESPACE + "}"):
            raise BuildError(f"history SVG uses a forbidden namespace: {label}")
        if any(attribute.startswith("{") or attribute not in HISTORY_ATTRIBUTES for attribute in element.attrib):
            raise BuildError(f"history SVG has a forbidden attribute: {label}")
        for attribute, value in element.attrib.items():
            if attribute in PRESENTATION_ATTRIBUTES and not PRESENTATION_VALUE_RE[attribute].fullmatch(value):
                raise BuildError(f"history SVG has an unsafe {attribute} value: {label}")
            if "\\" in value or EXTERNAL_REFERENCE_RE.search(value):
                raise BuildError(f"history SVG contains an external reference: {label}")
        for value in (element.text or "", element.tail or ""):
            if "\\" in value or EXTERNAL_REFERENCE_RE.search(value):
                raise BuildError(f"history SVG contains an external reference: {label}")


def live_root(root: Path) -> Path:
    root = Path(os.path.abspath(root))
    target = root / "live"
    if target.parent != root:
        raise BuildError("static root escaped repository")
    if target.is_symlink():
        raise BuildError("static root symlink rejected")
    return target


def scan_tree(directory: Path) -> tuple[set[PurePosixPath], set[PurePosixPath]]:
    files: set[PurePosixPath] = set()
    dirs: set[PurePosixPath] = set()

    def visit(current: Path, relative: PurePosixPath | None = None) -> None:
        with os.scandir(current) as entries:
            for entry in entries:
                child_rel = PurePosixPath(entry.name) if relative is None else relative / entry.name
                if entry.is_symlink():
                    raise BuildError(f"static symlink rejected: {child_rel}")
                if entry.is_dir(follow_symlinks=False):
                    dirs.add(child_rel)
                    visit(Path(entry.path), child_rel)
                elif entry.is_file(follow_symlinks=False):
                    files.add(child_rel)
                else:
                    raise BuildError(f"non-file static entry rejected: {child_rel}")

    if directory.exists():
        if not directory.is_dir() or directory.is_symlink():
            raise BuildError("static root is not a directory")
        visit(directory)
    return files, dirs


def preflight(root: Path, live: Path | None = None) -> dict[PurePosixPath, bytes]:
    """Read only approved sources, validate history, and reject source symlinks."""
    root = Path(os.path.abspath(root))
    mappings = source_map(root)
    _history_inventory(root, tuple(mapping for mapping in mappings if mapping[0].is_relative_to(HISTORY_SOURCE_DIR)))
    payloads: dict[PurePosixPath, bytes] = {}
    history_hashes: set[str] = set()
    for source_rel, target_rel in mappings:
        source = reject_symlink_chain(root, source_rel, "source")
        if not source.is_file():
            raise BuildError(f"source missing: {source_rel}")
        data = source.read_bytes()
        if source_rel.is_relative_to(HISTORY_SOURCE_DIR):
            _validate_history_svg(data, source_rel)
            source_hash = digest(data)
            if source_hash in history_hashes:
                raise BuildError(f"duplicate synthetic history SVG content: {source_rel}")
            history_hashes.add(source_hash)
        if target_rel in payloads:
            raise BuildError(f"duplicate generated target: {target_rel}")
        payloads[target_rel] = data
    if live is not None and Path(live).exists():
        # Existing output is replaced as a unit, but inspect it first so a
        # symlink or special file cannot be silently discarded.
        scan_tree(Path(live))
    return payloads


def verify(root: Path = ROOT) -> dict[str, str]:
    root = Path(os.path.abspath(root))
    mappings = source_map(root)
    _history_inventory(root, tuple(mapping for mapping in mappings if mapping[0].is_relative_to(HISTORY_SOURCE_DIR)))
    live = live_root(root)
    files, dirs = scan_tree(live)
    allowed_files = {target for _, target in mappings}
    allowed_dirs = frozenset(
        {
            PurePosixPath("js"),
            PurePosixPath("data"),
            PurePosixPath("data/synthetic"),
            PurePosixPath("synthetic-art"),
            HISTORY_TARGET_DIR,
        }
    )
    if files != allowed_files or dirs != set(allowed_dirs):
        extra_paths = (files - allowed_files) | (dirs - set(allowed_dirs))
        missing_paths = (allowed_files - files) | (set(allowed_dirs) - dirs)
        extras = sorted(map(str, extra_paths))
        missing = sorted(map(str, missing_paths))
        detail = [f"extra: {', '.join(extras)}"] if extras else []
        if missing:
            detail.append(f"missing: {', '.join(missing)}")
        raise BuildError("static tree does not exactly match allowlist (" + "; ".join(detail) + ")")
    hashes: dict[str, str] = {}
    history_hashes: set[str] = set()
    for source_rel, target_rel in mappings:
        source = reject_symlink_chain(root, source_rel, "source")
        target = reject_symlink_chain(live, target_rel, "target")
        if not source.is_file() or not target.is_file():
            raise BuildError(f"generated file missing: {target_rel}")
        source_data = source.read_bytes()
        target_data = target.read_bytes()
        if source_rel.is_relative_to(HISTORY_SOURCE_DIR):
            _validate_history_svg(source_data, source_rel)
            _validate_history_svg(target_data, target_rel)
            target_hash = digest(target_data)
            if target_hash in history_hashes:
                raise BuildError(f"duplicate generated synthetic history SVG content: {target_rel}")
            history_hashes.add(target_hash)
        source_hash = digest(source_data)
        target_hash = digest(target_data)
        if source_hash != target_hash:
            raise BuildError(f"generated hash mismatch: {target_rel}")
        hashes[str(target_rel)] = target_hash
    return hashes


def _write_stage(stage: Path, payloads: dict[PurePosixPath, bytes]) -> None:
    allowed_dirs = frozenset(
        {
            PurePosixPath("js"),
            PurePosixPath("data"),
            PurePosixPath("data/synthetic"),
            PurePosixPath("synthetic-art"),
            HISTORY_TARGET_DIR,
        }
    )
    for directory in sorted(allowed_dirs, key=lambda item: (len(item.parts), str(item))):
        (stage / Path(*directory.parts)).mkdir(mode=0o755, parents=False, exist_ok=True)
    for target_rel, data in payloads.items():
        target = stage / Path(*target_rel.parts)
        with tempfile.NamedTemporaryFile(prefix=".static-build-", dir=target.parent, delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(data)
        try:
            os.chmod(temporary, 0o644)
            os.replace(temporary, target)
        finally:
            if temporary.exists():
                temporary.unlink()


def build(root: Path = ROOT) -> dict[str, str]:
    root = Path(os.path.abspath(root))
    live = live_root(root)
    payloads = preflight(root, live)
    stage = Path(tempfile.mkdtemp(prefix=".static-stage-", dir=root))
    backup = root / ".static-live-backup"
    if backup.exists() or backup.is_symlink():
        shutil.rmtree(backup) if backup.is_dir() and not backup.is_symlink() else backup.unlink()
    old_moved = False
    new_installed = False
    try:
        _write_stage(stage, payloads)
        if live.exists():
            os.replace(live, backup)
            old_moved = True
        os.replace(stage, live)
        new_installed = True
        if backup.exists():
            shutil.rmtree(backup)
        return verify(root)
    except Exception:
        if new_installed and live.exists() and not live.is_symlink():
            shutil.rmtree(live)
        if old_moved and backup.exists():
            os.replace(backup, live)
        raise
    finally:
        if stage.exists():
            shutil.rmtree(stage)
        if backup.exists():
            shutil.rmtree(backup)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify without writing")
    args = parser.parse_args()
    hashes = verify() if args.check else build()
    print(f"PASS: synthetic static {len(hashes)} files")


# Keep the public map available to callers while deriving its history portion
# from the checked-in fixture at import time. Runtime operations derive it
# again, so a changed fixture can never use a stale allowlist.
SOURCE_MAP = source_map(ROOT)
ALLOWED_FILES = frozenset(target for _, target in SOURCE_MAP)
ALLOWED_DIRS = frozenset(
    {
        PurePosixPath("js"),
        PurePosixPath("data"),
        PurePosixPath("data/synthetic"),
        PurePosixPath("synthetic-art"),
        HISTORY_TARGET_DIR,
    }
)


if __name__ == "__main__":
    main()
