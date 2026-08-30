import http.client
import json
import threading
import unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/synthetic/art-investment.json"
DATA = json.loads(DATA_PATH.read_text(encoding="utf-8"))
OPEN_DART_HOSTS = {"dart.fss.or.kr", "englishdart.fss.or.kr", "opendart.fss.or.kr", "api.odcloud.kr"}
FORBIDDEN_KEYS = {"sourcePayload", "dueDiligencePayload", "sourceSnapshot", "legacySourceRef"}

import sys
sys.path.insert(0, str(ROOT))
import server


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def request(self, path, method="GET"):
        connection = http.client.HTTPConnection("127.0.0.1", self.httpd.server_port)
        connection.request(method, path)
        response = connection.getresponse()
        body = response.read()
        headers = dict(response.getheaders())
        connection.close()
        return response.status, body, headers

    def assert_synthetic_payload(self, value):
        if isinstance(value, dict):
            for key, child in value.items():
                self.assertNotIn(key, FORBIDDEN_KEYS)
                self.assert_synthetic_payload(child)
        elif isinstance(value, list):
            for child in value:
                self.assert_synthetic_payload(child)
        elif isinstance(value, str) and value.startswith(("http://", "https://")):
            host = (urlparse(value).hostname or "").lower().rstrip(".")
            self.assertTrue(host in OPEN_DART_HOSTS or host.endswith(".dart.fss.or.kr"), value)

    def test_catalog_is_the_synthetic_fixture(self):
        catalog = server.catalog()
        self.assertTrue(catalog["synthetic"])
        self.assertEqual(len(catalog["offerings"]), len(DATA["offerings"]))
        self.assertEqual(len(catalog["trackRecords"]), len(DATA["trackRecords"]))
        self.assert_synthetic_payload(catalog)
        status, body, headers = self.request("/api/catalog")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(json.loads(body), catalog)

    def test_history_endpoint_and_static_fixture(self):
        status, body, headers = self.request("/api/synthetic/history")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        history = json.loads(body)
        self.assertTrue(history["synthetic"])
        self.assertEqual(len(history["history"]), len(DATA["trackRecords"]))
        self.assert_synthetic_payload(history)
        status, body, headers = self.request("/data/synthetic/art-investment.json")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "public, max-age=300")
        self.assertEqual(body, DATA_PATH.read_bytes())
        status, body, headers = self.request("/synthetic-art/synthetic-artwork-01.svg")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Content-Type"], "image/svg+xml")
        self.assertEqual(body, (ROOT / "public/synthetic-art/synthetic-artwork-01.svg").read_bytes())
        self.assertEqual(self.request("/synthetic-art/synthetic-artwork-10.svg")[0], 404)

    def test_health_methods_and_allowlist(self):
        status, body, headers = self.request("/api/health")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"ok": True, "synthetic": True})
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        status, body, _ = self.request("/api/health", "HEAD")
        self.assertEqual(status, 200)
        self.assertEqual(body, b"")
        self.assertEqual(self.request("/api/catalog", "POST")[0], 405)
        for path in ("/server.py", "/data", "/data/", "/.env", "/../.env", "/data/synthetic/../art-investment.json"):
            self.assertEqual(self.request(path)[0], 404, path)

    def test_fixed_reader_rejects_paths_and_symlinks(self):
        with self.assertRaises(ValueError):
            server.read_fixed_json(Path("../data/synthetic/art-investment.json"))
        self.assertEqual(server.read_fixed_json(server.SYNTHETIC_DATA_PATH), DATA)


if __name__ == "__main__":
    unittest.main()
