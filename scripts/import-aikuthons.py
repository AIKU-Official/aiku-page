#!/usr/bin/env python3
"""Loads the AIKUTHON history from data/aikuthon/aikuthons.json into Supabase.

    python3 scripts/import-aikuthons.py .env.local            # dry run: report only
    python3 scripts/import-aikuthons.py .env.local --apply    # write

Each event is keyed by its `key` (stored as aikuthons.source_key), so running
this again updates the events and replaces their awards rather than adding
copies. Winners are linked to roster members by exact name when the roster has
exactly one member of that name; others stay as names and are reported.
"""
import json, sys, urllib.request, urllib.error, urllib.parse

env_file, apply = sys.argv[1], "--apply" in sys.argv
env = dict(l.strip().split("=", 1) for l in open(env_file) if "=" in l and not l.startswith("#"))
URL = env["NEXT_PUBLIC_SUPABASE_URL"].strip('"')
KEY = (env.get("SUPABASE_SECRET_KEY") or env["SUPABASE_SERVICE_ROLE_KEY"]).strip('"')


def call(method, path, body=None, prefer=None):
    headers = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(URL + path, method=method, headers=headers,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        text = urllib.request.urlopen(req, timeout=60).read().decode()
        return json.loads(text) if text else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path.split('?')[0]} failed: {e.code} {e.read().decode()[:300]}")


events = json.load(open("data/aikuthon/aikuthons.json"))
roster = {}
for m in call("GET", "/rest/v1/members?select=id,name"):
    roster.setdefault(m["name"], []).append(m["id"])
unmatched, linked = set(), 0

for event in events:
    row = {k: event[k] for k in ("edition", "kind", "name", "starts_on", "date_precision", "ends_on", "venue", "format", "partners",
                                 "task_title", "task_description", "metric", "participants", "competition_url")}
    row["source_key"] = event["key"]
    awards = []
    for i, award in enumerate(event["awards"]):
        people = []
        for j, name in enumerate(award["members"]):
            ids = roster.get(name, [])
            member_id = ids[0] if len(ids) == 1 else None
            linked += member_id is not None
            if member_id is None:
                unmatched.add(name)
            people.append({"name": name, "member_id": member_id, "sort_order": j})
        awards.append(({"rank": award["rank"], "label": award["label"], "team_name": award["team"], "sort_order": i}, people))

    if apply:
        saved = call("POST", "/rest/v1/aikuthons?on_conflict=source_key", row,
                     "resolution=merge-duplicates,return=representation")[0]
        call("DELETE", f"/rest/v1/aikuthon_awards?aikuthon_id=eq.{saved['id']}")
        for award, people in awards:
            created = call("POST", "/rest/v1/aikuthon_awards", {**award, "aikuthon_id": saved["id"]},
                           "return=representation")[0]
            if people:
                call("POST", "/rest/v1/aikuthon_award_members", [{**p, "award_id": created["id"]} for p in people])
    print(f"  {event['starts_on']}  {event['name']}  ({len(awards)} awards)")

print(f"{'applied' if apply else 'dry run'}: {len(events)} events, {linked} winners linked to members, "
      f"{len(unmatched)} not on the roster: {', '.join(sorted(unmatched))}")
