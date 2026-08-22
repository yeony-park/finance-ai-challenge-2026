import http.client
import json
import sys
import threading
import unittest
from pathlib import Path
from http.server import ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
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

    def test_art_only_catalog(self):
        status, body, headers = self.request("/api/catalog")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        catalog = json.loads(body)
        self.assertEqual(len(catalog["products"]), 5)
        self.assertTrue(all(item["category"] == "미술품" for item in catalog["products"]))
        self.assertEqual([item["id"] for item in catalog["issuers"]], ["togetherart"])

    def test_snapshot_endpoints_and_allowlist(self):
        for path, key, count in [
            ("/api/track-records/artnguide", "records", 187),
            ("/api/research/weshareart", None, 145),
            ("/api/track-records/tessa", "records", 6),
        ]:
            status, body, _ = self.request(path)
            self.assertEqual(status, 200, path)
            data = json.loads(body)
            actual = len(data["track_records"]["records"]) if key is None else len(data[key])
            self.assertEqual(actual, count)
        for path in ("/server.py", "/data/source_snapshots.json", "/.env", "/../.env"):
            self.assertEqual(self.request(path)[0], 404, path)

    def test_head_and_write_methods(self):
        status, body, headers = self.request("/api/health", "HEAD")
        self.assertEqual(status, 200)
        self.assertEqual(body, b"")
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(self.request("/api/catalog", "POST")[0], 405)

    def test_fixed_reader_rejects_paths(self):
        with self.assertRaises(ValueError):
            server.read_fixed_json(Path("../data/products.json"))


if __name__ == "__main__":
    unittest.main()
