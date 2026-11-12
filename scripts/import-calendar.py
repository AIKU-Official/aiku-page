#!/usr/bin/env python3
"""Loads AIKU's schedule from the Notion 일정(활동 DB) into activity_sessions.

    python3 scripts/import-calendar.py .env.local            # dry run: report only
    python3 scripts/import-calendar.py .env.local --apply    # write

Source: the "일정(활동 DB)" database on the "AIKU 활동용" Notion page
(NOTION_TOKEN). Each dated, titled row becomes one calendar entry; its 태그
decide the kind (see KINDS). The season is the stored season whose dates
hold the day (made by the database if missing, when applying).

Rows are keyed by their Notion page id, so running this again updates rather
than duplicates. A row of a kind that already has an entry on the same day
from the attendance import (keyed "<kind>:<date>") is that entry: it gains the
Notion id, the Notion title and end date, and keeps its attendance and the
date attendance was taken on (where the two disagree, the sheet wins).
Skipped and reported: rows without a date or title, AIKUTHON rows (the
aikuthons table is the record of those), and rows whose tags are unknown.
"""
from collections import Counter

from aiku_db import NotionApi, SupabaseRest, read_env, script_args

env_file, apply = script_args()
db = SupabaseRest.from_env_file(env_file)
notion = NotionApi(read_env(".env.local")["NOTION_TOKEN"])
SCHEDULE = "cb103c98-fc6f-49a6-ba0f-c1d5d610e01a"

# Notion tag -> kind, first match wins (a Seminar with 뒷풀이 is the Seminar).
KINDS = [
    ("DeepIntoDeep", "deepintodeep"),
    ("Momentum", "momentum"),
    ("Seminar", "seminar"),
    ("Conference", "conference"),
    # A required event that is also a joint one (제7회 HAYAKU) is the event:
    # that is the kind attendance is taken for.
    ("행사", "event"),
    ("NetworkingDay", "event"),
    ("교류", "exchange"),
    ("학사일정", "academic"),
    ("졸업식", "academic"),
    ("공휴일", "holiday"),
    ("공지", "notice"),
    ("리크루팅", "notice"),
]
# Untagged rows with a title are society events (e.g. Homecoming Day).
UNTAGGED = "event"


def kind_of(tags):
    for tag, kind in KINDS:
        if tag in tags:
            return kind
    return UNTAGGED if not tags else None


season_id = db.season_of_date(apply)
existing = db.get("/rest/v1/activity_sessions?select=id,kind,held_on,source_key,notion_page_id")
by_notion = {s["notion_page_id"]: s for s in existing if s["notion_page_id"]}
by_day = {(s["kind"], s["held_on"]): s for s in existing if not s["notion_page_id"]}

plan, skipped, kinds = [], [], Counter()
for row in notion.query_all(SCHEDULE):
    props = row["properties"]
    title = "".join(part["plain_text"] for part in props["이름"]["title"]).strip()
    tags = [tag["name"] for tag in props["태그"]["multi_select"]]
    date = props["날짜"]["date"]
    if not date:
        skipped.append(f"날짜 없음: {title or '(제목 없음)'}")
        continue
    start = date["start"][:10]
    if not title:
        skipped.append(f"제목 없음: {start} {'/'.join(tags)}")
        continue
    if "AIKUTHON" in tags:
        skipped.append(f"AIKUTHON 표에 있음: {title}")
        continue
    kind = kind_of(tags)
    if not kind:
        skipped.append(f"모르는 태그 {tags}: {title}")
        continue
    end = (date.get("end") or "")[:10] or None
    entry = {
        "notion_page_id": row["id"],
        "kind": kind,
        "title": title,
        "held_on": start,
        "ends_on": end if end and end > start else None,
        "season_id": season_id(start),
    }
    match = by_notion.get(row["id"]) or by_day.pop((kind, start), None)
    plan.append((entry, match))
    kinds[kind] += 1

updates = sum(1 for _, match in plan if match)
print(f"가져올 일정 {len(plan)}개 (새로 {len(plan) - updates}, 기존 일정에 연결·갱신 {updates}), 건너뜀 {len(skipped)}개")
print("종류별:", dict(kinds))
for line in skipped:
    print("  건너뜀:", line)

if apply:
    for entry, match in plan:
        if match:
            # A session the attendance import made keeps the date attendance was
            # taken on; Notion only adds its id, title and end date.
            if (match.get("source_key") or "").startswith(f"{entry['kind']}:"):
                entry = {k: v for k, v in entry.items() if k not in ("held_on", "season_id")}
            db.request("PATCH", f"/rest/v1/activity_sessions?id=eq.{match['id']}", entry)
        else:
            db.upsert("activity_sessions", entry | {"source_key": "notion:" + entry["notion_page_id"]}, "source_key")
    print(f"{len(plan)}개를 반영했습니다.")
else:
    print("미리보기입니다. 쓰려면 --apply를 붙이세요.")
