#!/usr/bin/env python3
"""Build a clean, synthetic-only static document root.

The output is an allowlisted copy of the static shell and the synthetic
fixture.  It never reads, serves, or preserves other repository data.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import shutil
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
    (PurePosixPath("data/synthetic/art-investment.json"), PurePosixPath("data/synthetic/art-investment.json")),
    *((
        PurePosixPath(f"public/synthetic-art/synthetic-artwork-{index:02d}.svg"),
        PurePosixPath(f"synthetic-art/synthetic-artwork-{index:02d}.svg"),
    ) for index in range(1, 10)),
)
ALLOWED_FILES = frozenset(target for _, target in SOURCE_MAP)
ALLOWED_DIRS = frozenset((PurePosixPath("js"), PurePosixPath("data"), PurePosixPath("data/synthetic"), PurePosixPath("synthetic-art")))


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
        if not directory.is_dir():
            raise BuildError("static root is not a directory")
        visit(directory)
    return files, dirs


def preflight(root: Path, live: Path | None = None) -> dict[PurePosixPath, bytes]:
    """Read only approved sources and reject source symlinks."""
    root = Path(os.path.abspath(root))
    payloads: dict[PurePosixPath, bytes] = {}
    for source_rel, target_rel in SOURCE_MAP:
        source = reject_symlink_chain(root, source_rel, "source")
        if not source.is_file():
            raise BuildError(f"source missing: {source_rel}")
        payloads[target_rel] = source.read_bytes()
    if live is not None and Path(live).exists():
        # Existing output is replaced as a unit, but inspect it first so a
        # symlink or special file cannot be silently discarded.
        scan_tree(Path(live))
    return payloads


def verify(root: Path = ROOT) -> dict[str, str]:
    root = Path(os.path.abspath(root))
    live = live_root(root)
    files, dirs = scan_tree(live)
    if files != set(ALLOWED_FILES) or dirs != set(ALLOWED_DIRS):
        extra_paths = (files - set(ALLOWED_FILES)) | (dirs - set(ALLOWED_DIRS))
        missing_paths = (set(ALLOWED_FILES) - files) | (set(ALLOWED_DIRS) - dirs)
        extras = sorted(map(str, extra_paths))
        missing = sorted(map(str, missing_paths))
        detail = [f"extra: {', '.join(extras)}"] if extras else []
        if missing:
            detail.append(f"missing: {', '.join(missing)}")
        raise BuildError("static tree does not exactly match allowlist (" + "; ".join(detail) + ")")
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
    return hashes


def _write_stage(stage: Path, payloads: dict[PurePosixPath, bytes]) -> None:
    for directory in sorted(ALLOWED_DIRS, key=lambda item: (len(item.parts), str(item))):
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


if __name__ == "__main__":
    main()
