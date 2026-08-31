import functools
import hashlib
import http.client
import importlib.util
import json
import re
import shutil
import tempfile
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("build_live_static", ROOT / "scripts/build_live_static.py")
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)
DATA = json.loads((ROOT / "data/synthetic/art-investment.json").read_text(encoding="utf-8"))
FORBIDDEN_KEYS = {"sourcePayload", "dueDiligencePayload", "sourceSnapshot", "legacySourceRef"}
OPEN_DART_HOSTS = {"dart.fss.or.kr", "englishdart.fss.or.kr", "opendart.fss.or.kr", "api.odcloud.kr"}


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class LiveStaticTest(unittest.TestCase):
    def assert_safe_payload(self, value):
        if isinstance(value, dict):
            for key, child in value.items():
                self.assertNotIn(key, FORBIDDEN_KEYS)
                self.assert_safe_payload(child)
        elif isinstance(value, list):
            for child in value:
                self.assert_safe_payload(child)
        elif isinstance(value, str) and value.startswith(("http://", "https://")):
            host = (urlparse(value).hostname or "").lower().rstrip(".")
            self.assertTrue(host in OPEN_DART_HOSTS or host.endswith(".dart.fss.or.kr"), value)

    def test_checked_in_tree_contains_only_synthetic_allowlist(self):
        hashes = BUILDER.verify(ROOT)
        self.assertEqual(set(hashes), {str(x) for x in BUILDER.ALLOWED_FILES})
        for source_rel, target_rel in BUILDER.SOURCE_MAP:
            source = (ROOT / str(source_rel)).read_bytes()
            target = (ROOT / "live" / str(target_rel)).read_bytes()
            self.assertEqual(hashlib.sha256(source).digest(), hashlib.sha256(target).digest())
        live_data = json.loads((ROOT / "live/data/synthetic/art-investment.json").read_text(encoding="utf-8"))
        self.assertEqual(len(live_data["offerings"]), len(DATA["offerings"]))
        self.assertEqual(len(live_data["trackRecords"]), len(DATA["trackRecords"]))
        self.assert_safe_payload(live_data)
        self.assertFalse((ROOT / "live" / ".env").exists())
        handler = functools.partial(QuietHandler, directory=str(ROOT / "live"))
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        try:
            for path in ("/.env", "/../.env", "/%2e%2e/.env", "/data/not-allowlisted.json"):
                connection = http.client.HTTPConnection("127.0.0.1", httpd.server_port)
                connection.request("GET", path)
                response = connection.getresponse()
                body = response.read()
                self.assertEqual(response.status, 404, path)
                self.assertNotIn(b"DART_API_KEY", body)
                connection.close()
        finally:
            httpd.shutdown()
            httpd.server_close()

    def test_history_allowlist_is_derived_and_source_inventory_is_exact(self):
        mappings = BUILDER.source_map(ROOT)
        history = [
            (source_rel, target_rel)
            for source_rel, target_rel in mappings
            if source_rel.is_relative_to(BUILDER.HISTORY_SOURCE_DIR)
        ]
        expected = {
            (f"public/synthetic-art/history/{record['id']}.svg", f"synthetic-art/history/{record['id']}.svg")
            for record in DATA["trackRecords"]
        }
        self.assertEqual(len(history), 318)
        self.assertEqual({(str(source), str(target)) for source, target in history}, expected)
        self.assertIn(BUILDER.HISTORY_TARGET_DIR, BUILDER.ALLOWED_DIRS)

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for source_rel, _ in mappings:
                source = ROOT / str(source_rel)
                target = root / str(source_rel)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)
            history_dir = root / "public/synthetic-art/history"
            BUILDER.build(root)
            extra = history_dir / "synthetic-extra.svg"
            extra.write_text("<svg/>", encoding="utf-8")
            with self.assertRaises(BUILDER.BuildError):
                BUILDER.verify(root)
            with self.assertRaises(BUILDER.BuildError):
                BUILDER.build(root)
            extra.unlink()
            missing = history_dir / "synthetic-track-01-001.svg"
            missing.unlink()
            with self.assertRaises(BUILDER.BuildError):
                BUILDER.verify(root)
            with self.assertRaises(BUILDER.BuildError):
                BUILDER.build(root)
            missing.symlink_to(ROOT / "public/synthetic-art/history/synthetic-track-01-001.svg")
            with self.assertRaises(BUILDER.BuildError):
                BUILDER.build(root)

    def test_history_validator_rejects_css_escaped_external_presentation_values(self):
        escaped_url = r"u\72 l(h\74 tp:\2f \2f 127.0.0.1:9999\2f paint.svg\23 p)"
        for attribute in sorted(BUILDER.PRESENTATION_ATTRIBUTES):
            with self.subTest(attribute=attribute):
                source_path = next(
                    path
                    for path in sorted((ROOT / "public/synthetic-art/history").glob("*.svg"))
                    if re.search(rf"(?<![A-Za-z0-9_.:-]){re.escape(attribute)}=\"", path.read_text(encoding="utf-8"))
                )
                source = source_path.read_text(encoding="utf-8")
                match = re.search(
                    rf"(?<![A-Za-z0-9_.:-]){re.escape(attribute)}=\"[^\"]*\"", source
                )
                self.assertIsNotNone(match)
                replacement = f'{attribute}="{escaped_url}"'
                mutated = source[: match.start()] + replacement + source[match.end() :]
                BUILDER._validate_history_svg(source_path.read_bytes(), source_path)
                with self.assertRaises(BUILDER.BuildError):
                    BUILDER._validate_history_svg(mutated.encode("utf-8"), source_path)

    def test_static_explorer_contract_uses_synthetic_navigation_and_detail_fields(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        search = (ROOT / "search.html").read_text(encoding="utf-8")
        app = (ROOT / "js/app.js").read_text(encoding="utf-8")
        api = (ROOT / "js/api.js").read_text(encoding="utf-8")
        self.assertIn('action="search.html"', index)
        self.assertIn('name="q"', index)
        for marker in ("id=\"platform-filter\"", "id=\"status-filter\"", "id=\"scope-filter\"", "id=\"history-detail\"", "id=\"history-detail-close\""):
            self.assertIn(marker, search)
        for marker in ("normalizeUrlState", "filterOfferings", "filterHistory", "paginate", "historyDates", "historyDetailFields", "visibleReturn", "loadHistory"):
            self.assertIn(marker, app)
        self.assertIn("/api/catalog", api)
        self.assertIn("/api/synthetic/history", api)
        self.assertNotIn("<a", app)

    def test_builder_rejects_extra_and_symlink(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for source_rel, _ in BUILDER.SOURCE_MAP:
                source = ROOT / str(source_rel)
                target = root / str(source_rel)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)
            (root / ".env").write_text("SECRET=not-read", encoding="utf-8")
            BUILDER.build(root)
            self.assertFalse((root / "live" / ".env").exists())
            (root / "live" / "extra.txt").write_text("extra", encoding="utf-8")
            with self.assertRaises(BUILDER.BuildError):
                BUILDER.verify(root)
            (root / "live" / "extra.txt").unlink()
            (root / "live" / "index.html").unlink()
            (root / "live" / "index.html").symlink_to(root / "index.html")
            with self.assertRaises(BUILDER.BuildError):
                BUILDER.build(root)


if __name__ == "__main__":
    unittest.main()
