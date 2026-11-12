#!/usr/bin/env python3
"""Adds the team members listed in data/notion/member-overrides.json to their
projects, without re-running the whole Notion import (which reads the same
file, so a full re-import keeps them).

    python3 scripts/apply-member-overrides.py .env.local            # dry run
    python3 scripts/apply-member-overrides.py .env.local --apply

Only exact, unique roster names are linked; anything else is reported.
Members already on the project are left as they are.
"""
import json

from aiku_db import SupabaseRest, script_args

env_file, apply = script_args()
db = SupabaseRest.from_env_file(env_file)

roster = {}
for m in db.get("/rest/v1/members?select=id,name"):
    roster.setdefault(m["name"], []).append(m["id"])

for page_id, entry in json.load(open("data/notion/member-overrides.json")).items():
    project = db.get(f"/rest/v1/projects?select=id,title,project_members(name,member_id,sort_order)&notion_page_id=eq.{page_id}")
    if not project:
        print(f"  no project for {entry['title']}")
        continue
    project = project[0]
    have = {p["name"] for p in project["project_members"]}
    order = max([p["sort_order"] for p in project["project_members"]] + [-1]) + 1
    added = []
    for name in entry["members"]:
        if name in have:
            continue
        ids = roster.get(name, [])
        if len(ids) != 1:
            print(f"  {project['title']}: {name} not matched uniquely ({len(ids)})")
            continue
        added.append({"project_id": project["id"], "name": name, "member_id": ids[0], "role": "member", "sort_order": order})
        order += 1
    if added and apply:
        db.insert("project_members", added)
    print(f"  {project['title']}: {'added' if apply else 'would add'} {', '.join(a['name'] for a in added) or 'nobody'}")
