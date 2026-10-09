import hashlib
import http.server
import json
import os
import secrets
import sqlite3
import time
import urllib.parse
from http import HTTPStatus

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(ROOT, "data"))
DB_PATH = os.environ.get("DB_PATH", os.path.join(DATA_DIR, "calculator.db"))
PORT = int(os.environ.get("PORT", "80"))
SESSION_DAYS = 30

# Only these files are public. Everything else in ROOT (the SQLite database in
# data/, server.py, Dockerfile, .github, ...) must never be served.
STATIC_FILES = {
    "/index.html",
    "/app.js",
    "/charts.js",
    "/history-interaction.js",
    "/styles.css",
    "/icon.svg",
    "/manifest.webmanifest",
}

os.makedirs(DATA_DIR, exist_ok=True)

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS calculations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expression TEXT NOT NULL,
        result TEXT NOT NULL,
        label TEXT DEFAULT '',
        created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_calculations_user_created ON calculations(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
    """)
    conn.commit()
    conn.close()

def password_hash(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 210_000).hex()

def make_session(user_id):
    token = secrets.token_urlsafe(32)
    expires = int(time.time()) + SESSION_DAYS * 86400
    conn = db()
    conn.execute("INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)", (token, user_id, expires))
    conn.commit()
    conn.close()
    return token

def current_user(handler):
    token = handler.cookies().get("session")
    if not token:
        return None
    conn = db()
    row = conn.execute("SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?", (token, int(time.time()))).fetchone()
    conn.close()
    return row

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".webmanifest": "application/manifest+json"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        print("[ultimate-calculator] " + fmt % args)

    def cookies(self):
        from http.cookies import SimpleCookie
        c = SimpleCookie()
        c.load(self.headers.get("Cookie", ""))
        return {k: morsel.value for k, morsel in c.items()}

    def send_json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length > 64 * 1024:
            raise ValueError("Request too large")
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8") or "{}")

    def set_session_cookie(self, token):
        self.send_header("Set-Cookie", f"session={token}; Path=/; Max-Age={SESSION_DAYS*86400}; HttpOnly; SameSite=Lax")

    def clear_session_cookie(self):
        self.send_header("Set-Cookie", "session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")

    def require_user(self):
        user = current_user(self)
        if not user:
            self.send_json({"error": "Authentication required"}, HTTPStatus.UNAUTHORIZED)
            return None
        return user

    def send_head(self):
        # Used by both GET and HEAD for static files.
        path = urllib.parse.urlparse(self.path).path
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
        super().end_headers()

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/health":
            self.send_json({"ok": True})
            return
        if path == "/api/me":
            user = current_user(self)
            self.send_json({"authenticated": bool(user), "user": dict(user) if user else None})
            return
        if path == "/api/history":
            user = self.require_user()
            if not user: return
            conn = db()
            rows = conn.execute("SELECT id,expression,result,label,created_at FROM calculations WHERE user_id=? ORDER BY created_at DESC LIMIT 500", (user["id"],)).fetchall()
            conn.close()
            self.send_json({"items": [dict(r) for r in rows]})
            return
        return super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        try:
            data = self.read_json()
        except Exception:
            self.send_json({"error": "Invalid request"}, HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/register":
            username = str(data.get("username", "")).strip()
            password = str(data.get("password", ""))
            if len(username) < 3 or len(username) > 40 or not all(ch.isalnum() or ch in "._-" for ch in username):
                self.send_json({"error": "Username must be 3–40 characters and use letters, numbers, dot, dash or underscore."}, HTTPStatus.BAD_REQUEST)
                return
            if len(password) < 8 or len(password) > 200:
                self.send_json({"error": "Password must be at least 8 characters."}, HTTPStatus.BAD_REQUEST)
                return
            salt = secrets.token_hex(16)
            conn = db()
            try:
                cur = conn.execute("INSERT INTO users(username,password_hash,salt,created_at) VALUES(?,?,?,?)", (username, password_hash(password, salt), salt, int(time.time())))
                conn.commit()
                user_id = cur.lastrowid
            except sqlite3.IntegrityError:
                conn.close()
                self.send_json({"error": "That username is already in use."}, HTTPStatus.CONFLICT)
                return
            conn.close()
            token = make_session(user_id)
            self.send_response(HTTPStatus.CREATED)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.set_session_cookie(token)
            self.end_headers()
            self.wfile.write(json.dumps({"authenticated": True, "user": {"id": user_id, "username": username}}).encode())
            return

        if path == "/api/login":
            username = str(data.get("username", "")).strip()
            password = str(data.get("password", ""))
            conn = db()
            row = conn.execute("SELECT id,username,password_hash,salt FROM users WHERE username=? COLLATE NOCASE", (username,)).fetchone()
            conn.close()
            if not row or not secrets.compare_digest(password_hash(password, row["salt"]), row["password_hash"]):
                self.send_json({"error": "Invalid username or password."}, HTTPStatus.UNAUTHORIZED)
                return
            token = make_session(row["id"])
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.set_session_cookie(token)
            self.end_headers()
            self.wfile.write(json.dumps({"authenticated": True, "user": {"id": row["id"], "username": row["username"]}}).encode())
            return

        if path == "/api/logout":
            token = self.cookies().get("session")
            if token:
                conn = db(); conn.execute("DELETE FROM sessions WHERE token=?", (token,)); conn.commit(); conn.close()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self.clear_session_cookie()
            self.end_headers()
            self.wfile.write(b'{"authenticated":false}')
            return

        if path == "/api/history":
            user = self.require_user()
            if not user: return
            expression = str(data.get("expression", "")).strip()
            result = str(data.get("result", "")).strip()
            label = str(data.get("label", "")).strip()[:300]
            if not expression or not result or len(expression) > 2000 or len(result) > 500:
                self.send_json({"error": "Invalid calculation."}, HTTPStatus.BAD_REQUEST)
                return
            conn = db()
            cur = conn.execute("INSERT INTO calculations(user_id,expression,result,label,created_at) VALUES(?,?,?,?,?)", (user["id"], expression, result, label, int(time.time())))
            conn.commit(); calculation_id = cur.lastrowid; conn.close()
            self.send_json({"id": calculation_id})
            return

        self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def do_DELETE(self):
        path = urllib.parse.urlparse(self.path).path
        user = self.require_user()
        if not user: return
        conn = db()
        if path == "/api/history":
            conn.execute("DELETE FROM calculations WHERE user_id=?", (user["id"],))
            conn.commit(); conn.close()
            self.send_json({"ok": True})
            return
        if path.startswith("/api/history/"):
            try: calculation_id = int(path.rsplit("/", 1)[1])
            except ValueError:
                conn.close(); self.send_json({"error":"Invalid id"}, HTTPStatus.BAD_REQUEST); return
            conn.execute("DELETE FROM calculations WHERE id=? AND user_id=?", (calculation_id, user["id"]))
            conn.commit(); conn.close()
            self.send_json({"ok": True})
            return
        conn.close()
        self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

if __name__ == "__main__":
    init_db()
    print(f"Ultimate Calculator listening on :{PORT}, database: {DB_PATH}")
    http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
