"""Read-only local server for the synthetic art-investment fixture.

This server deliberately has no live-data adapter.  Its API and static file
allowlist expose only the synthetic fixture and the small static demo shell.
"""
from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
SYNTHETIC_DATA_PATH = Path("data/synthetic/art-investment.json")
SYNTHETIC_ART_PATHS = frozenset(f"/synthetic-art/synthetic-artwork-{index:02d}.svg" for index in range(1, 10))


def read_fixed_json(path: Path) -> object:
    """Read one fixed, repository-relative JSON file without path traversal."""
    if path.is_absolute() or any(part in (".", "..") for part in path.parts):
        raise ValueError("invalid fixed path")
    candidate = ROOT.joinpath(*path.parts)
    if candidate.is_symlink() or not candidate.is_file():
        raise OSError("not a regular file")
    return json.loads(candidate.read_text(encoding="utf-8"))


def read_synthetic_data() -> dict:
    data = read_fixed_json(SYNTHETIC_DATA_PATH)
    if not isinstance(data, dict):
        raise ValueError("synthetic fixture must be an object")
    return data


def catalog() -> dict:
    """Return the fixture as a catalog with an explicit synthetic marker."""
    data = read_synthetic_data()
    return {**data, "synthetic": True}


def synthetic_history() -> dict:
    """Return the fixture's optional history collection without other sources."""
    data = read_synthetic_data()
    history = data.get("history", data.get("trackRecords", data.get("events", [])))
    if not isinstance(history, (list, dict)):
        history = []
    return {"synthetic": True, "history": history}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_: object) -> None:
        pass

    def _send(
        self,
        status: int,
        body: bytes = b"",
        content_type: str = "text/plain; charset=utf-8",
        head: bool = False,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'",
        )
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
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self._send(200, encoded, "application/json; charset=utf-8", head)

    def _route(self, head: bool) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            return self._send(200, b'{"ok":true,"synthetic":true}', "application/json; charset=utf-8", head)
        if path == "/api/catalog":
            try:
                return self._json(catalog(), head)
            except (OSError, ValueError, KeyError, json.JSONDecodeError):
                return self._send(503, b'{"error":"synthetic catalog unavailable"}', "application/json; charset=utf-8", head)
        if path == "/api/synthetic/history":
            try:
                return self._json(synthetic_history(), head)
            except (OSError, ValueError, KeyError, json.JSONDecodeError):
                return self._send(503, b'{"error":"synthetic history unavailable"}', "application/json; charset=utf-8", head)
        if path == "/":
            path = "/index.html"
        allowed = {
            "/index.html",
            "/search.html",
            "/suitability.html",
            "/styles.css",
            "/js/app.js",
            "/js/api.js",
            "/data/synthetic/art-investment.json",
            *SYNTHETIC_ART_PATHS,
        }
        relative = f"public{path}" if path in SYNTHETIC_ART_PATHS else path
        candidate = ROOT / relative.lstrip("/")
        try:
            target = candidate.resolve(strict=True)
            within_root = ROOT in target.parents
        except OSError:
            target = candidate
            within_root = False
        if path not in allowed or candidate.is_symlink() or not within_root or not target.is_file():
            return self._send(404, b"not found", head=head)
        types = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
        }
        return self._send(200, target.read_bytes(), types[target.suffix], head)

    def do_POST(self) -> None:
        self._send(405, b"method not allowed")

    do_PUT = do_POST
    do_DELETE = do_POST


def main() -> None:
    ThreadingHTTPServer(("127.0.0.1", 8000), Handler).serve_forever()


if __name__ == "__main__":
    main()
