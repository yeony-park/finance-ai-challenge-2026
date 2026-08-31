import re
import subprocess
import tempfile
import unittest
from functools import lru_cache
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HANDOFF = ROOT / "SYNTHETIC_ART_HANDOFF.md"
VERCELIGNORE = ROOT / ".vercelignore"


def _tracked_paths():
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    return tuple(path for path in result.stdout.decode("utf-8").split("\0") if path)


@lru_cache(maxsize=1)
def _ignore_repo():
    """Create a clean Git fixture so .gitignore cannot affect the checks."""
    temp_dir = tempfile.TemporaryDirectory(prefix="synthetic-art-ignore-")
    ignore_root = Path(temp_dir.name)
    subprocess.run(["git", "init", "--quiet"], cwd=ignore_root, check=True)
    (ignore_root / ".gitignore").write_text(
        VERCELIGNORE.read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    return temp_dir, ignore_root


def _ignored(path: str) -> bool:
    """Use Git's ignore engine, which matches Vercel's ignore-file syntax."""
    _, ignore_root = _ignore_repo()
    result = subprocess.run(
        ["git", "check-ignore", "--no-index", "--quiet", "--", path],
        cwd=ignore_root,
    )
    return result.returncode == 0


class SyntheticArtHandoffTest(unittest.TestCase):
    def test_vercelignore_blocks_tracked_internal_material(self):
        tracked = set(_tracked_paths())
        blocked = (
            ".codex/agents/luna.toml",
            ".vscode/settings.json",
            "AGENTS.md",
            "CODEX_GOAL.md",
            "PROJECT_STATUS.md",
            "data/demo/art-investment.json",
            "public/demo-art/art-1.svg",
            "docs/PRD.md",
            "deliverables/조각투자_구조_설명자료_2026-08-10.docx",
        )
        for path in blocked:
            with self.subTest(path=path):
                self.assertIn(path, tracked, "fixture must be an actual tracked path")
                self.assertTrue(_ignored(path), path)

    def test_vercelignore_blocks_secrets_and_handoff_paths(self):
        blocked = (
            ".env",
            ".env.local",
            ".env.production",
            "app/.env.local",
            "SYNTHETIC_ART_HANDOFF.md",
            ".claude/settings.json",
            ".git/config",
            "raw/source.json",
            "report/result.md",
            "snapshot/catalog.json",
            "temp/build.txt",
            "tmp/build.txt",
            "internal/notes.md",
            "docs/internal-plan.md",
            "workspace/notes.txt",
            "_workspace/notes.txt",
        )
        for path in blocked:
            with self.subTest(path=path):
                self.assertTrue(_ignored(path), path)

    def test_vercelignore_keeps_required_tracked_inputs(self):
        tracked = set(_tracked_paths())
        allowed = (
            ".env.example",
            "app/page.tsx",
            "components/art/charts.tsx",
            "lib/art/dtos.ts",
            "package.json",
            "next.config.ts",
            "tsconfig.json",
            "data/synthetic/art-investment.json",
            "public/synthetic-art/synthetic-artwork-01.svg",
            "public/synthetic-art/history/synthetic-track-01-001.svg",
            "data/art/dart-filing-manifest.json",
        )
        for path in allowed:
            with self.subTest(path=path):
                self.assertIn(path, tracked, "fixture must be an actual tracked path")
                self.assertFalse(_ignored(path), path)

    def test_handoff_names_the_one_piece_branch_and_files(self):
        text = HANDOFF.read_text(encoding="utf-8")
        self.assertIn("synthetic-feature-restore", text)
        self.assertIn("data/synthetic/art-investment.json", text)
        self.assertIn("public/synthetic-art/", text)
        self.assertIn("327", text)
        self.assertIn("git fetch origin synthetic-feature-restore", text)
        self.assertIn("git worktree add --detach", text)
        self.assertIn("`main` 또는 `integration`에 이 내용을 **merge하지 않습니다**.", text)
        self.assertIn("`main` 또는 `integration`에 **push하지 않습니다**.", text)
        self.assertNotRegex(text, re.compile(r"git\s+(?:merge|push)\s+(?:origin\s+)?(?:main|integration)"))


if __name__ == "__main__":
    unittest.main()
