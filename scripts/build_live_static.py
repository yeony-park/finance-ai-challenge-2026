#!/usr/bin/env python3
"""Build the secret-free, stored-data-only Live Server document root."""
from __future__ import annotations

import argparse
import hashlib
import os
import tempfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
SOURCE_MAP = (
    (PurePosixPath("index.html"), PurePosixPath("index.html")),
    (PurePosixPath("search.html"), PurePosixPath("search.html")),
    (PurePosixPath("suitability.html"), PurePosixPath("suitability.html")),
    (PurePosixPath("styles.css"), PurePosixPath("styles.css")),
    (PurePosixPath("js/app.js"), PurePosixPath("js/app.js")),
    (PurePosixPath("js/api.js"), PurePosixPath("js/api.js")),
    (PurePosixPath("js/calculations.js"), PurePosixPath("js/calculations.js")),
    (PurePosixPath("js/track-records.js"), PurePosixPath("js/track-records.js")),
    (PurePosixPath("data/products.json"), PurePosixPath("data/products.json")),
    (PurePosixPath("data/issuers.json"), PurePosixPath("data/issuers.json")),
    (PurePosixPath("data/artnguide_track_records.json"), PurePosixPath("data/artnguide_track_records.json")),
    (PurePosixPath("data/weshareart_research.json"), PurePosixPath("data/weshareart_research.json")),
    (PurePosixPath("data/tessa_sale_records.json"), PurePosixPath("data/tessa_sale_records.json")),
)
ALLOWED_FILES = frozenset(target for _, target in SOURCE_MAP)
ALLOWED_DIRS = frozenset((PurePosixPath("js"), PurePosixPath("data")))


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


def live_root(root: Path) -> Path:
    root = Path(os.path.abspath(root))
    target = root / "live"
    if target.parent != root:
        raise BuildError("live root escaped repository")
    if target.is_symlink():
        raise BuildError("live root symlink rejected")
    return target


def scan_tree(live: Path) -> tuple[set[PurePosixPath], set[PurePosixPath]]:
    files: set[PurePosixPath] = set()
    dirs: set[PurePosixPath] = set()

    def visit(directory: Path, relative: PurePosixPath | None = None) -> None:
        for entry in os.scandir(directory):
            child_rel = PurePosixPath(entry.name) if relative is None else relative / entry.name
            if entry.is_symlink():
                raise BuildError(f"live symlink rejected: {child_rel}")
            if entry.is_dir(follow_symlinks=False):
                dirs.add(child_rel)
                visit(Path(entry.path), child_rel)
            elif entry.is_file(follow_symlinks=False):
                files.add(child_rel)
            else:
                raise BuildError(f"non-file live entry rejected: {child_rel}")

    if live.exists():
        if not live.is_dir():
            raise BuildError("live root is not a directory")
        visit(live)
    return files, dirs


def preflight(root: Path, live: Path) -> dict[PurePosixPath, bytes]:
    payloads: dict[PurePosixPath, bytes] = {}
    for source_rel, target_rel in SOURCE_MAP:
        source = reject_symlink_chain(root, source_rel, "source")
        if not source.is_file():
            raise BuildError(f"source missing: {source_rel}")
        reject_symlink_chain(live, target_rel, "target")
        payloads[target_rel] = source.read_bytes()
    files, dirs = scan_tree(live)
    extra_files = files - ALLOWED_FILES
    extra_dirs = dirs - ALLOWED_DIRS
    if extra_files or extra_dirs:
        names = sorted(map(str, extra_files | extra_dirs))
        raise BuildError("unlisted live entries rejected: " + ", ".join(names))
    return payloads


def verify(root: Path = ROOT) -> dict[str, str]:
    root = Path(os.path.abspath(root))
    live = live_root(root)
    files, dirs = scan_tree(live)
    if files != set(ALLOWED_FILES) or dirs != set(ALLOWED_DIRS):
        raise BuildError("live tree does not exactly match allowlist")
    hashes: dict[str, str] = {}
    for source_rel, target_rel in SOURCE_MAP:
        source = reject_symlink_chain(root, source_rel, "source")
        target = reject_symlink_chain(live, target_rel, "target")
        if not source.is_file() or not target.is_file():
            raise BuildError(f"generated file missing: {target_rel}")
        source_hash = digest(source.read_bytes())
        target_hash = digest(target.read_bytes())
        if source_hash != target_hash:
            raise BuildError(f"generated hash mismatch: {target_rel}")
        hashes[str(target_rel)] = target_hash
    if (live / ".env").exists():
        raise BuildError("secret file present in live root")
    return hashes


def build(root: Path = ROOT) -> dict[str, str]:
    root = Path(os.path.abspath(root))
    live = live_root(root)
    payloads = preflight(root, live)
    live.mkdir(mode=0o755, parents=False, exist_ok=True)
    for directory in sorted(ALLOWED_DIRS, key=str):
        reject_symlink_chain(live, directory, "target").mkdir(mode=0o755, parents=False, exist_ok=True)
    for target_rel, data in payloads.items():
        target = reject_symlink_chain(live, target_rel, "target")
        temporary: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(prefix=".live-build-", dir=target.parent, delete=False) as handle:
                handle.write(data)
                temporary = Path(handle.name)
            os.chmod(temporary, 0o644)
            os.replace(temporary, target)
        finally:
            if temporary is not None and temporary.exists():
                temporary.unlink()
    return verify(root)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="verify without writing")
    args = parser.parse_args()
    hashes = verify() if args.check else build()
    print(f"PASS: live static {len(hashes)} files")


if __name__ == "__main__":
    main()
