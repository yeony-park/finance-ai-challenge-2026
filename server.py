"""Read-only local server for the checked-in art research snapshots."""
from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
ARTNGUIDE_TRACK_RECORDS_PATH = Path("data/artnguide_track_records.json")
WESHAREART_RESEARCH_PATH = Path("data/weshareart_research.json")
TESSA_SALE_RECORDS_PATH = Path("data/tessa_sale_records.json")


def read_fixed_json(path: Path) -> dict:
    """Read a fixed, repository-relative JSON snapshot without path traversal."""
    if path.is_absolute() or any(part in (".", "..") for part in path.parts):
        raise ValueError("invalid fixed path")
    candidate = ROOT.joinpath(*path.parts)
    if candidate.is_symlink() or not candidate.is_file():
        raise OSError("not a regular file")
    return json.loads(candidate.read_text(encoding="utf-8"))


def catalog() -> dict:
    products = read_fixed_json(Path("data/products.json"))
    issuers = read_fixed_json(Path("data/issuers.json"))
    return {
        "products": products["products"],
        "issuers": issuers["issuers"],
        "live_status": {"message": "검증 저장본 · 외부 상품 API 미연결"},
        "api_status": {"products": {}, "global": {}},
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_: object) -> None:
        pass

    def _send(self, status: int, body: bytes = b"", content_type: str = "text/plain; charset=utf-8", head: bool = False) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'")
        self.send_header("Cache-Control", "no-store" if self.path.startswith("/api/") else "public, max-age=300")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def do_GET(self) -> None:
        self._route(False)

    def do_HEAD(self) -> None:
        self._route(True)

    def _json(self, body: dict, head: bool) -> None:
        self._send(200, json.dumps(body, ensure_ascii=False).encode(), "application/json; charset=utf-8", head)

    def _route(self, head: bool) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            return self._send(200, b'{"ok":true}', "application/json; charset=utf-8", head)
        fixed_apis = {
            "/api/track-records/artnguide": ARTNGUIDE_TRACK_RECORDS_PATH,
            "/api/research/weshareart": WESHAREART_RESEARCH_PATH,
            "/api/track-records/tessa": TESSA_SALE_RECORDS_PATH,
        }
        if path == "/api/catalog":
            try:
                return self._json(catalog(), head)
            except (OSError, ValueError, KeyError, json.JSONDecodeError):
                return self._send(503, b'{"error":"catalog unavailable"}', "application/json; charset=utf-8", head)
        if path in fixed_apis:
            try:
                return self._json(read_fixed_json(fixed_apis[path]), head)
            except (OSError, ValueError, json.JSONDecodeError):
                return self._send(503, b'{"error":"snapshot unavailable"}', "application/json; charset=utf-8", head)
        if path == "/":
            path = "/index.html"
        allowed = {
            "/index.html", "/search.html", "/suitability.html", "/styles.css",
            "/js/app.js", "/js/api.js", "/js/calculations.js", "/js/track-records.js",
            "/data/products.json", "/data/issuers.json", "/data/artnguide_track_records.json",
            "/data/weshareart_research.json", "/data/tessa_sale_records.json",
        }
        candidate = ROOT / path.lstrip("/")
        try:
            target = candidate.resolve(strict=True)
            within_root = ROOT in target.parents
        except OSError:
            target = candidate
            within_root = False
        if path not in allowed or candidate.is_symlink() or not within_root or not target.is_file():
            return self._send(404, b"not found", head=head)
        types = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8"}
        return self._send(200, target.read_bytes(), types[target.suffix], head)

    def do_POST(self) -> None:
        self._send(405, b"method not allowed")

    do_PUT = do_POST
    do_DELETE = do_POST


def main() -> None:
    ThreadingHTTPServer(("127.0.0.1", 8000), Handler).serve_forever()


if __name__ == "__main__":
    main()
