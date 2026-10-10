"""Static file server for the Docker image.

The app runs entirely in the browser, so this only serves the files below.
GitHub Pages serves the same files, so both deployments behave the same.
"""
import http.server
import os
import urllib.parse
from http import HTTPStatus

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "80"))

# Only these files are public. Everything else in ROOT (server.py, Dockerfile, .github, ...) is never served.
STATIC_FILES = {
    "/index.html",
    "/app.js",
    "/charts.js",
    "/history-interaction.js",
    "/styles.css",
    "/icon.svg",
    "/manifest.webmanifest",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".webmanifest": "application/manifest+json"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        print("[ultimate-calculator] " + fmt % args)

    def send_head(self):
        # Used by both GET and HEAD.
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/health":
            body = b'{"ok":true}'
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if self.command == "GET":
                self.wfile.write(body)
            return None
        if path == "/":
            path = "/index.html"
        if path not in STATIC_FILES:
            self.send_error(HTTPStatus.NOT_FOUND)
            return None
        self.path = path
        return super().send_head()

    def end_headers(self):
        path = urllib.parse.urlparse(self.path).path if hasattr(self, "path") else ""
        if path == "/" or path.endswith(".html"):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
        elif path.endswith((".js", ".css", ".webmanifest")):
            self.send_header("Cache-Control", "no-cache, must-revalidate, max-age=0")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()


if __name__ == "__main__":
    print(f"Ultimate Calculator listening on :{PORT}")
    http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
