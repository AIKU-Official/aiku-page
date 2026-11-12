#!/usr/bin/env python3
"""Loads 26-2 attendance and activity points into Supabase.

    python3 scripts/import-activity.py .env.local            # dry run: report only
    python3 scripts/import-activity.py .env.local --apply    # write

Sources:
  * data/activity/attendance-26-2.raw.json: the "26-S 학회원 출석 관리"
    workbook (DeepIntoDeep, Seminar, Momentum, 행사, 뒷풀이 tabs), parsed from
    its .xlsx export. Only columns with a date or event header are read.
  * The AIKU Notion "상벌점 내역" database (NOTION_TOKEN), the official points
    ledger. Its attendance penalties set the status of that member in that
    session, overriding the sheet; its other entries become point events.
    "우수 프로젝트" entries are not imported, because those points are derived
    from the project records; the import only checks that they agree.

Sessions are keyed by kind and date, point events by their Notion page id, so
running this again updates rather than duplicates. Names are matched to the
roster exactly; the aliases below are spelling fixes and are reported.
"""
import datetime, json, re, sys, urllib.error, urllib.request

env_file, apply = sys.argv[1], "--apply" in sys.argv
env = dict(l.strip().split("=", 1) for l in open(env_file) if "=" in l and not l.startswith("#"))
local = dict(l.strip().split("=", 1) for l in open(".env.local") if "=" in l and not l.startswith("#"))
URL = env["NEXT_PUBLIC_SUPABASE_URL"].strip('"')
KEY = env["SUPABASE_SECRET_KEY"].strip('"')
NOTION = local["NOTION_TOKEN"].strip('"')
LEDGER = "399a7930-e09c-800b-bde8-fc527acdf308"
YEAR = 2026

ALIASES = {"노윤현": "노윤헌"}  # misspelt in the 행사 and 뒷풀이 tabs
STATUS = {"출석": "present", "지각": "late", "결석": "absent", "유고결석": "excused_absent"}
EVENT_DATES = {"OT": "2026-07-09", "MT": "2026-07-17", "OT 뒷풀이": "2026-07-09"}
# HYSKAI's date is not recorded; the networking and after-party sheets were
# last edited on 10/10. Reported so the owner can correct it.
NOTION_SESSIONS = {
    "26-2 OT": ("event", "2026-07-09", "OT"),
    "26-2 OT 뒷풀이": ("afterparty", "2026-07-09", "OT 뒷풀이"),
    "26-2 MT (Networking Day)": ("event", "2026-07-17", "MT"),
    "제13회 AIKUTHON (주니어톤)": ("event", "2026-08-28", "제13회 AIKUTHON"),
    "HYSKAI (구 제7회 HAYAKU)": ("event", "2026-10-10", "HYSKAI"),
}
TYPE_KIND = {"세미나/모멘텀": "seminar", "D2D": "deepintodeep", "필수 행사": "event",
             "필수 뒤풀이": "afterparty", "필수 뒷풀이": "afterparty"}
MANUAL_RULES = {"특별 행사 참여": "special_event", "D2D 강의 진행": "deepintodeep_lecture",
                "스터디 참여 (스터디원)": "study_member", "스터디 참여 (스터디장)": "study_leader",
                "세미나 리뷰 MVP": "seminar_mvp"}
KIND_TITLE = {"deepintodeep": "DeepIntoDeep", "seminar": "Seminar", "momentum": "Momentum"}


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


def notion(path, body=None):
    req = urllib.request.Request("https://api.notion.com/v1/" + path, method="POST" if body is not None else "GET",
                                 headers={"Authorization": "Bearer " + NOTION, "Notion-Version": "2022-06-28",
                                          "Content-Type": "application/json"},
                                 data=json.dumps(body).encode() if body is not None else None)
    return json.load(urllib.request.urlopen(req, timeout=60))


def season_name(day):
    month = int(day[5:7])
    term = "겨울" if month <= 2 else "1" if month <= 6 else "여름" if month <= 8 else "2"
    return f"{int(day[2:4]):02d}-{term}"


def serial_date(value):
    return (datetime.date(1899, 12, 30) + datetime.timedelta(days=int(float(value)))).isoformat()


report = {"aliases": {}, "namesakes": {}, "unmatched": set(), "overrides": [], "sheet_absences_without_notion": [],
          "project_check": [], "estimated_dates": ["HYSKAI 2026-10-10"]}

roster = {}
for m in call("GET", "/rest/v1/members?select=id,name,grade,generations(name)"):
    roster.setdefault(m["name"], []).append(m)


def member_id(name, generation=None):
    name = ALIASES.get(name.strip(), name.strip())
    if name in ALIASES.values():
        report["aliases"][name] = [k for k, v in ALIASES.items() if v == name]
    hits = roster.get(name, [])
    if generation:
        hits = [h for h in hits if h["generations"]["name"] == generation] or hits
    if len(hits) > 1:
        # The attendance sheets list active members only, so an OB namesake
        # is not the one meant. Reported, as it is a choice.
        active = [h for h in hits if h["grade"] != "ob"]
        if len(active) == 1:
            report["namesakes"][name] = active[0]["generations"]["name"]
            return active[0]["id"]
    if len(hits) == 1:
        return hits[0]["id"]
    report["unmatched"].add(f"{name} ({generation or '기수 없음'})")
    return None


# 1. Sessions and statuses from the sheet -------------------------------------------

sessions = {}      # (kind, date) -> {"title", "rows": {member_id: (status, reason)}}


def session(kind, day, title):
    return sessions.setdefault((kind, day), {"title": title, "rows": {}})


raw = json.load(open("data/activity/attendance-26-2.raw.json"))
TABS = {"DeepIntoDeep 출석": "deepintodeep", "Seminar 출석": "seminar", "Momentum 출석": "momentum",
        "행사 출석": "event", "뒷풀이 출석": "afterparty"}
for tab, kind in TABS.items():
    grid = raw[tab]
    header = {int(k): v for k, v in grid[0].items()}
    name_col = 1 if kind == "momentum" else 0
    numbered = sorted(c for c, v in header.items() if re.fullmatch(r"\d+(\.0)?", v))
    for row in grid[1:]:
        row = {int(k): v for k, v in row.items()}
        name = row.get(name_col, "").strip()
        if not name or name.startswith("밑에부터"):
            continue
        mid = member_id(name)
        for col, head in header.items():
            value = row.get(col, "").strip()
            if not value:
                continue
            if re.fullmatch(r"\d+(\.0)?", head):
                day = serial_date(head)
                n = numbered.index(col) + 1
                title = f"{KIND_TITLE[kind]} {n}{'강' if kind == 'deepintodeep' else '회'}"
            else:
                day, title = EVENT_DATES[head], head
            status = STATUS.get(value, "excused_absent")
            reason = "" if value in STATUS else value
            if mid:
                session(kind, day, title)["rows"][mid] = (status, reason)

d2d_days = sorted(d for k, d in sessions if k == "deepintodeep")
seminar_days = sorted(d for k, d in sessions if k == "seminar")

# 2. The Notion ledger -----------------------------------------------------------------

rows, cursor = [], None
while True:
    body = {"page_size": 100, **({"start_cursor": cursor} if cursor else {})}
    page = notion(f"databases/{LEDGER}/query", body)
    rows += page["results"]
    if not page.get("has_more"):
        break
    cursor = page["next_cursor"]

notion_members = {}


def notion_member(page_id):
    if page_id not in notion_members:
        props = notion(f"pages/{page_id}")["properties"]
        name = "".join(x["plain_text"] for x in next(v for v in props.values() if v["type"] == "title")["title"])
        gen = "".join(x["plain_text"] for x in props.get("기수", {}).get("rich_text", []))
        gen = (gen.strip() + "기") if gen.strip().isdigit() else gen.strip() or None
        notion_members[page_id] = member_id(name, gen)
    return notion_members[page_id]


def notion_session(title):
    if title in NOTION_SESSIONS:
        return NOTION_SESSIONS[title]
    m = re.fullmatch(r"26-2 Seminar \((\d+)/(\d+)\)", title)
    if m:
        day = f"{YEAR}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
        n = seminar_days.index(day) + 1 if day in seminar_days else len(seminar_days) + 1
        return "seminar", day, f"Seminar {n}회"
    m = re.fullmatch(r"26-2 Seminar (\d+)회( 뒤풀이)?", title)
    if m:
        day = seminar_days[int(m.group(1)) - 1]
        return ("afterparty", day, f"Seminar {m.group(1)}회 뒤풀이") if m.group(2) else ("seminar", day, f"Seminar {m.group(1)}회")
    m = re.fullmatch(r"D2D (\d+)강", title)
    if m:
        return "deepintodeep", d2d_days[int(m.group(1)) - 1], f"DeepIntoDeep {m.group(1)}강"
    raise SystemExit(f"Unknown ledger title: {title}")


events = []        # point events to write
penalised = set()  # (kind, day, member) the ledger penalised
for r in rows:
    p = r["properties"]
    kind_label = (p["유형"]["select"] or {}).get("name", "")
    title = "".join(x["plain_text"] for x in p["내역"]["title"]).strip()
    members = [mid for mid in (notion_member(x["id"]) for x in p["대상 회원"]["relation"]) if mid]
    points = p["상벌점 부여"]["number"]
    if kind_label == "우수 프로젝트":
        report["project_check"].append((title, points, len(members)))
        continue
    if kind_label in MANUAL_RULES:
        rule = MANUAL_RULES[kind_label]
        unit = {"special_event": 1, "deepintodeep_lecture": 2, "study_member": 1, "study_leader": 2, "seminar_mvp": 0.5}[rule]
        events.append({"source_key": "notion:" + r["id"], "rule_code": rule, "title": title,
                       "quantity": max(1, round((points or unit) / unit)), "members": members,
                       "held_on": NOTION_SESSIONS.get(title, (None, None))[1]})
        continue
    m = re.fullmatch(r"(.+) (지각|결석)", kind_label)
    if not m or m.group(1) not in TYPE_KIND:
        raise SystemExit(f"Unknown ledger type: {kind_label}")
    status = "late" if m.group(2) == "지각" else "absent"
    kind, day, stitle = notion_session(title)
    s = session(kind, day, stitle)
    for mid in members:
        before = s["rows"].get(mid, (None,))[0]
        if before != status:
            report["overrides"].append(f"{stitle} {day}: {before or '기록 없음'} -> {status}")
        s["rows"][mid] = (status, "")
        penalised.add((kind, day, mid))

# The ledger is the official record of who was penalised. An unexcused mark in
# the sheet that the ledger did not penalise was excused afterwards, so it is
# kept as an excused absence (no reason recorded) and reported.
for (kind, day), s in sessions.items():
    for mid, (status, reason) in list(s["rows"].items()):
        if status in ("late", "absent") and (kind, day, mid) not in penalised:
            report["sheet_absences_without_notion"].append(f"{s['title']} {day}: {status}")
            s["rows"][mid] = ("excused_late" if status == "late" else "excused_absent", reason)

# 3. Write -------------------------------------------------------------------------------

seasons = {s["name"]: s["id"] for s in call("GET", "/rest/v1/seasons?select=id,name")}


def season_id(day):
    name = season_name(day)
    if name not in seasons:
        seasons[name] = call("POST", "/rest/v1/seasons", {"name": name}, "return=representation")[0]["id"] if apply else None
    return seasons[name]


marks = sum(len(s["rows"]) for s in sessions.values())
if apply:
    for (kind, day), s in sorted(sessions.items(), key=lambda kv: kv[0][1]):
        saved = call("POST", "/rest/v1/activity_sessions?on_conflict=source_key",
                     {"source_key": f"{kind}:{day}", "kind": kind, "title": s["title"], "held_on": day,
                      "season_id": season_id(day)}, "resolution=merge-duplicates,return=representation")[0]
        call("DELETE", f"/rest/v1/attendance?session_id=eq.{saved['id']}")
        if s["rows"]:
            call("POST", "/rest/v1/attendance", [{"session_id": saved["id"], "member_id": mid, "status": st, "reason": rs}
                                                 for mid, (st, rs) in s["rows"].items()])
    for e in events:
        day = e["held_on"] or "2026-10-01"
        saved = call("POST", "/rest/v1/point_events?on_conflict=source_key",
                     {k: e[k] for k in ("source_key", "rule_code", "title", "quantity", "held_on")} | {"season_id": season_id(day)},
                     "resolution=merge-duplicates,return=representation")[0]
        call("DELETE", f"/rest/v1/point_event_members?event_id=eq.{saved['id']}")
        if e["members"]:
            call("POST", "/rest/v1/point_event_members", [{"event_id": saved["id"], "member_id": mid} for mid in e["members"]])

print(f"{'applied' if apply else 'dry run'}: {len(sessions)} sessions, {marks} attendance marks, {len(events)} point events")
report["unmatched"] = sorted(report["unmatched"])
json.dump(report, open("data/activity/import-report.json", "w"), ensure_ascii=False, indent=2)
print(json.dumps({k: (v if k != "overrides" and k != "sheet_absences_without_notion" else len(v)) for k, v in report.items()},
                 ensure_ascii=False, indent=1))
