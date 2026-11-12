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


class SupabaseRest:
    """The project's REST and Storage APIs, called with the secret key."""

    def __init__(self, url, key, timeout=60, site_url=None):
        self.url, self.key, self.timeout = url.rstrip("/"), key, timeout
        self.site_url = site_url.rstrip("/") if site_url else None

    @classmethod
    def from_env_file(cls, path, timeout=60):
        env = read_env(path)
        key = env.get("SUPABASE_SECRET_KEY") or env["SUPABASE_SERVICE_ROLE_KEY"]
        return cls(env["NEXT_PUBLIC_SUPABASE_URL"], key, timeout, env.get("NEXT_PUBLIC_SITE_URL"))

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

    def refresh_pages(self, kinds):
        """Asks the site to rebuild the public pages showing these kinds of
        content ("news", "projects", "members", "aikuthons") instead of waiting
        for the hourly refresh. Never fails the import; it only reports."""
        if not self.site_url:
            print("  pages not refreshed: no NEXT_PUBLIC_SITE_URL in the env file")
            return
        req = urllib.request.Request(self.site_url + "/api/revalidate", method="POST",
                                     data=json.dumps({"kinds": list(kinds)}).encode(),
                                     headers={"Authorization": "Bearer " + self.key, "Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=30).read()
            print(f"  pages refreshed on {self.site_url}: {', '.join(kinds)}")
        except (urllib.error.URLError, urllib.error.HTTPError) as error:
            print(f"  pages not refreshed ({error}); they update within the hour")

    def season_of_date(self, apply):
        """A lookup from an ISO day to the id of its season, by the dates stored
        on each season (the seasons table is the record; no month rule here).
        A season not stored yet is made by the database (season_for_date) when
        applying, and reported."""
        known = self.get("/rest/v1/seasons?select=id,name,starts_on,ends_on")

        def season_id(day):
            for season in known:
                if season["starts_on"] <= day[:10] <= season["ends_on"]:
                    return season["id"]
            if not apply:
                print(f"  new season needed for {day[:10]}")
                return None
            made = self.rpc("season_for_date", {"p_day": day[:10], "p_create": True})
            known[:] = self.get("/rest/v1/seasons?select=id,name,starts_on,ends_on")
            print(f"  new season for {day[:10]}: " + next(s["name"] for s in known if s["id"] == made))
            return made

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
