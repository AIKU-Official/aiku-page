#!/usr/bin/env python3
"""Loads the AIKUTHON history from data/aikuthon/aikuthons.json into Supabase.

    python3 scripts/import-aikuthons.py .env.local            # dry run: report only
    python3 scripts/import-aikuthons.py .env.local --apply    # write

Each event is keyed by its `key` (stored as aikuthons.source_key), so running
this again updates the events and replaces their awards rather than adding
copies; partners, tracks and awards are replaced each time. Winners are linked to roster members by exact name when the roster has
exactly one member of that name; others stay as names and are reported.
"""
import json

from aiku_db import SupabaseRest, script_args

env_file, apply = script_args()
db = SupabaseRest.from_env_file(env_file)


events = json.load(open("data/aikuthon/aikuthons.json"))
season_id = db.season_of_date(apply)
roster = {}
for m in db.get("/rest/v1/members?select=id,name"):
    roster.setdefault(m["name"], []).append(m["id"])
unmatched, linked = set(), 0

for event in events:
    row = {k: event[k] for k in ("edition", "kind", "format", "name", "starts_on", "date_precision", "ends_on", "venue",
                                 "mode", "overnight", "team_size_min", "team_size_max", "platform",
                                 "task_title", "task_description", "metric", "competition_url")}
    row["season_id"] = season_id(event["starts_on"])
    partners = [{"name": p["name"], "role": p["role"], "sort_order": i} for i, p in enumerate(event["partners"])]
    tracks = [{"name": name, "sort_order": i} for i, name in enumerate(event["tracks"])]
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
        awards.append(({"rank": award["rank"], "team_name": award["team"]}, people))

    if apply:
        saved = db.upsert("aikuthons", row, "source_key")
        db.rpc("set_aikuthon_tags", {"p_aikuthon_id": saved["id"], "p_names": event["tags"]})
        for table, children in (("aikuthon_partners", partners), ("aikuthon_tracks", tracks)):
            db.delete(table, f"aikuthon_id=eq.{saved['id']}")
            if children:
                db.insert(table, [{**c, "aikuthon_id": saved["id"]} for c in children])
        db.delete("aikuthon_awards", f"aikuthon_id=eq.{saved['id']}")
        for award, people in awards:
            created = db.insert("aikuthon_awards", {**award, "aikuthon_id": saved["id"]}, returning=True)[0]
            if people:
                db.insert("aikuthon_award_members", [{**p, "award_id": created["id"]} for p in people])
    print(f"  {event['starts_on']}  {event['name']}  ({len(awards)} awards)")

print(f"{'applied' if apply else 'dry run'}: {len(events)} events, {linked} winners linked to members, "
      f"{len(unmatched)} not on the roster: {', '.join(sorted(unmatched))}")

if apply:
    db.refresh_pages(["aikuthons"])
