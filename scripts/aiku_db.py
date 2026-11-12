"""Shared helpers for the import scripts: reading an env file, calling the
Supabase REST and Storage APIs with the secret key, and the season a date
falls in. Imported by every script in this folder (run them from the repo
root as `python3 scripts/<name>.py <env file> [--apply]`).
"""
import json
import sys
import urllib.error
import urllib.request


def read_env(path):
    """KEY=value lines of an env file, quotes removed. Values are never printed."""
    pairs = (line.strip().split("=", 1) for line in open(path) if "=" in line and not line.startswith("#"))
    return {key: value.strip('"') for key, value in pairs}


def script_args():
    """(env file, apply) from the command line: the env file first, --apply to write."""
    if len(sys.argv) < 2:
        raise SystemExit(f"usage: python3 {sys.argv[0]} <env file> [--apply]")
    return sys.argv[1], "--apply" in sys.argv


def season_name(day):
    """The season a date falls in, named like "26-여름": Jan–Feb winter,
    Mar–Jun 1st semester, Jul–Aug summer, Sep–Dec 2nd semester."""
    year, month = int(day[:4]), int(day[5:7])
    term = "겨울" if month <= 2 else "1" if month <= 6 else "여름" if month <= 8 else "2"
    return f"{year % 100:02d}-{term}"


class SupabaseRest:
    """The project's REST and Storage APIs, called with the secret key."""

    def __init__(self, url, key, timeout=60):
        self.url, self.key, self.timeout = url.rstrip("/"), key, timeout

    @classmethod
    def from_env_file(cls, path, timeout=60):
        env = read_env(path)
        key = env.get("SUPABASE_SECRET_KEY") or env["SUPABASE_SERVICE_ROLE_KEY"]
        return cls(env["NEXT_PUBLIC_SUPABASE_URL"], key, timeout)

    def request(self, method, path, body=None, *, prefer=None, headers=None, raw=None):
        """One call; JSON in and out unless `raw` bytes are sent. Exits on an HTTP error."""
        sent = {"apikey": self.key, "Authorization": "Bearer " + self.key, **(headers or {})}
        if prefer:
            sent["Prefer"] = prefer
        data = raw
        if raw is None and body is not None:
            data = json.dumps(body).encode()
            sent["Content-Type"] = "application/json"
        req = urllib.request.Request(self.url + path, method=method, data=data, headers=sent)
        try:
            text = urllib.request.urlopen(req, timeout=self.timeout).read().decode()
            return json.loads(text) if text else None
        except urllib.error.HTTPError as error:
            raise SystemExit(f"{method} {path.split('?')[0]} failed: {error.code} {error.read().decode()[:300]}")

    def get(self, path):
        return self.request("GET", path)

    def insert(self, table, rows, *, returning=False):
        return self.request("POST", f"/rest/v1/{table}", rows, prefer="return=representation" if returning else None)

    def upsert(self, table, row, on_conflict):
        """Insert or update one row keyed by `on_conflict`; returns the stored row."""
        return self.request("POST", f"/rest/v1/{table}?on_conflict={on_conflict}", row,
                            prefer="resolution=merge-duplicates,return=representation")[0]

    def delete(self, table, query):
        return self.request("DELETE", f"/rest/v1/{table}?{query}")

    def rpc(self, function, args):
        return self.request("POST", f"/rest/v1/rpc/{function}", args)

    def season_ids(self, apply):
        """A lookup from season name to id that creates missing seasons when applying."""
        known = {s["name"]: s["id"] for s in self.get("/rest/v1/seasons?select=id,name")}

        def season_id(name):
            if name not in known:
                known[name] = self.insert("seasons", {"name": name}, returning=True)[0]["id"] if apply else None
                print(f"  new season {name}")
            return known[name]

        return season_id


class NotionApi:
    """The Notion API with an integration token (read-only use)."""

    def __init__(self, token):
        self.token = token

    def request(self, path, body=None):
        req = urllib.request.Request(
            "https://api.notion.com/v1/" + path,
            method="POST" if body is not None else "GET",
            headers={"Authorization": "Bearer " + self.token, "Notion-Version": "2022-06-28",
                     "Content-Type": "application/json"},
            data=json.dumps(body).encode() if body is not None else None,
        )
        return json.load(urllib.request.urlopen(req, timeout=60))

    def query_all(self, database_id):
        """Every row of a database, following the pages."""
        rows, cursor = [], None
        while True:
            page = self.request(f"databases/{database_id}/query",
                                {"page_size": 100, **({"start_cursor": cursor} if cursor else {})})
            rows += page["results"]
            if not page.get("has_more"):
                return rows
            cursor = page["next_cursor"]
