#!/usr/bin/env python3
"""Marks 활동 OB members from the AIKU Notion member list.

    python3 scripts/import-member-grades.py .env.local            # dry run: report only
    python3 scripts/import-member-grades.py .env.local --apply    # write

Source: the "AIKU 학회원" database in the AIKU Notion workspace (NOTION_TOKEN),
whose 등급 is 명예 OB / 활동 OB / 주니어 / 시니어. Each 활동 OB there is
matched to one roster member by exact name and generation number; a member
who is plain OB (명예 OB) on the site becomes active_ob. Nothing else changes:
주니어 and 시니어 follow the site's own rule, and nobody is demoted, so running
this again changes nothing. Members that match no one, or more than one, are
reported and left alone.
"""
import re
import urllib.parse
from collections import defaultdict

from aiku_db import NotionApi, SupabaseRest, read_env, script_args

env_file, apply = script_args()
db = SupabaseRest.from_env_file(env_file)
notion = NotionApi(read_env(".env.local")["NOTION_TOKEN"])
MEMBERS = "399a7930-e09c-8079-bac6-d364de27ff70"


def text(prop):
    kind = prop["type"]
    if kind in ("title", "rich_text"):
        return "".join(part["plain_text"] for part in prop[kind]).strip()
    if kind == "select":
        return (prop["select"] or {}).get("name", "")
    return ""


def generation(name):
    found = re.search(r"\d+", name or "")
    return found.group(0) if found else None


roster = defaultdict(list)
for member in db.get("/rest/v1/members?select=id,name,grade,generations(name)"):
    roster[(member["name"].strip(), generation(member["generations"]["name"]))].append(member)

to_mark, already, unmatched = [], 0, []
for row in notion.query_all(MEMBERS):
    props = row["properties"]
    if "활동 OB" not in text(props["등급"]):
        continue
    name, gen = text(props["Name"]), text(props["기수"])
    hits = roster.get((name, generation(gen)), [])
    if len(hits) != 1:
        unmatched.append(f"{name} ({gen}): 명단에서 {len(hits)}명")
    elif hits[0]["grade"] == "active_ob":
        already += 1
    elif hits[0]["grade"] == "ob":
        to_mark.append(hits[0])
    else:
        unmatched.append(f"{name} ({gen}): 사이트에서는 {hits[0]['grade']}라 바꾸지 않음")

print(f"활동 OB로 바꿀 회원 {len(to_mark)}명, 이미 활동 OB {already}명, 확인 필요 {len(unmatched)}명")
for line in unmatched:
    print("  확인 필요:", line)

if apply and to_mark:
    ids = ",".join(member["id"] for member in to_mark)
    db.request("PATCH", f"/rest/v1/members?id=in.({urllib.parse.quote(ids)})&grade=eq.ob", {"grade": "active_ob"})
    db.refresh_pages(["members"])
    print(f"{len(to_mark)}명을 활동 OB로 바꿨습니다.")
elif not apply:
    print("미리보기입니다. 쓰려면 --apply를 붙이세요.")
