#!/usr/bin/env python3
"""Loads the talks of Seminar and Momentum sessions, and DeepIntoDeep's
lectures, from the AIKU Notion workspace into session_talks.

    python3 scripts/import-talks.py .env.local            # dry run: report only
    python3 scripts/import-talks.py .env.local --apply    # write

Sources (NOTION_TOKEN, read only):
  * Each Seminar and Momentum session page (activity_sessions.notion_page_id,
    from import-calendar.py). A talk starts at a heading such as "First Talk"
    or "Second Talk(NLP)"; under it, the bullets after "Title", "Talker" and
    "Topic" are its title, speakers and keywords. A Momentum track comes from
    "(CV)" on the talk's heading, or on the section heading ("Talk (CV)"), and
    carries on to the next talks in the same column. Tracks are matched to
    tags by name or abbreviation (tags.abbreviation).
  * Each "<season> DeepIntoDeep" page's 커리큘럼 table (구분 | 주제 | 발표자):
    row "5회" becomes the talk of that season's DeepIntoDeep session numbered 5.

Talks are keyed by their Notion block, so running this again updates rather
than duplicates; a session's talks that are no longer in Notion are removed.
Speakers are matched to the roster by exact name; a name shared by two
members is left unlinked and reported. A talk whose Talker is empty in Notion
keeps the speakers entered on the site. Template text ("제목을 적어주세요.")
is ignored. A talk with no title and no speaker is skipped; when its
uploaded file names a person, that is reported as a guess, never applied.
"""
import re
from collections import Counter, defaultdict

from aiku_db import NotionApi, SupabaseRest, read_env, script_args

env_file, apply = script_args()
db = SupabaseRest.from_env_file(env_file)
notion = NotionApi(read_env(".env.local")["NOTION_TOKEN"])

PLACEHOLDERS = {"제목을 적어주세요.", "발표자 이름을 적어주세요.", "주제를 적어주세요.", "…", "...", ""}
TALK = re.compile(r"\b(first|second|third|fourth|fifth|sixth|\d+(st|nd|rd|th))\s*talk\b", re.I)
TRACK = re.compile(r"\(([^)]+)\)")
FIELDS = {"title": "title", "talker": "speakers", "speaker": "speakers", "topic": "keywords"}


def text(block):
    kind = block["type"]
    if kind == "table_row":
        return ["".join(part["plain_text"] for part in cell).strip() for cell in block[kind]["cells"]]
    value = block.get(kind, {})
    if kind in ("file", "pdf"):
        return value.get("name", "")
    return "".join(part.get("plain_text", "") for part in value.get("rich_text", [])).strip()


def children(block_id):
    out, cursor = [], None
    while True:
        page = notion.request(f"blocks/{block_id}/children?page_size=100" + (f"&start_cursor={cursor}" if cursor else ""))
        out += page["results"]
        if not page.get("has_more"):
            return out
        cursor = page["next_cursor"]


# --- the roster and the tracks ---------------------------------------------------
members = defaultdict(list)
for m in db.get("/rest/v1/members?select=id,name,generations(name)"):
    members[m["name"].strip()].append((m["id"], m["generations"]["name"]))
tags = db.get("/rest/v1/tags?select=id,name,abbreviation")
track_of = {}
for tag in tags:
    for label in (tag["name"], tag["abbreviation"]):
        if label:
            track_of[label.strip().lower()] = tag["id"]

report = defaultdict(list)


def clean_name(raw):
    """A speaker as written, made into a roster-style name: "고건영 (5기)" gives
    ("고건영", "5기"); "김민영." gives "김민영"; a Notion mention of a person
    shown given name first ("@규민 김") gives "김규민"."""
    name = raw.strip().rstrip(".").strip()
    generation = None
    found = re.search(r"\s*\((\d+기)\)\s*$", name)
    if found:
        generation, name = found.group(1), name[: found.start()].strip()
    if name.startswith("@"):
        name = name[1:].strip()
        parts = name.split()
        if len(parts) == 2 and len(parts[1]) == 1 and re.fullmatch(r"[가-힣]+", parts[0] + parts[1]):
            name = parts[1] + parts[0]
    return name, generation


def speaker_rows(names):
    rows = []
    for position, raw in enumerate(names):
        name, generation = clean_name(raw)
        found = members.get(name, [])
        if generation:
            same = [m for m in found if m[1] == generation]
            if found and not same:
                report["적힌 기수의 회원이 없어 연결하지 않음"].append(f"{raw} (명단: {', '.join(m[1] for m in found)})")
            found = same
        if len(found) > 1:
            report["이름이 같은 회원이 여럿이라 연결하지 않음"].append(name)
        elif not found:
            report["명단에 없는 발표자 (이름만 저장)"].append(raw if raw != name else name)
        rows.append({"name": name, "member_id": found[0][0] if len(found) == 1 else None, "sort_order": position})
    return rows


def split_names(value):
    return [name.strip() for name in re.split(r"[,/&·]|\s+및\s+", value) if name.strip()]


# --- Seminar and Momentum: talks on each session page --------------------------
def read_talks(blocks, section_track, out):
    """Walks a page or column in order; returns the talks found, depth first."""
    talk, field, column_track = None, None, section_track
    for block in blocks:
        kind, value = block["type"], text(block)
        if kind == "column_list":
            for column in children(block["id"]):
                read_talks(children(column["id"]), section_track, out)
            continue
        if kind == "heading_1":
            label = TRACK.search(value)
            section_track = column_track = label.group(1) if label else None
            talk = field = None
            continue
        if kind in ("heading_2", "heading_3") and TALK.search(value):
            label = TRACK.search(value)
            column_track = label.group(1) if label else column_track
            talk = {"key": block["id"], "track": column_track, "title": "", "speakers": [], "keywords": [], "files": []}
            out.append(talk)
            field = None
            continue
        if talk is None:
            continue
        if kind == "paragraph":
            word = value.split("(")[0].strip().lower()
            field = FIELDS.get(word) if word in FIELDS else ("files" if word.startswith("materials") else None)
            continue
        if kind == "bulleted_list_item" and field and value not in PLACEHOLDERS:
            if field == "title" and not talk["title"]:
                talk["title"] = value
            elif field == "speakers":
                talk["speakers"] += split_names(value)
            elif field == "keywords":
                # A keyword is a few words; a sentence under Topic (a question, a
                # polite Korean ending, or a very long line) is a note, not a keyword.
                if len(value) > 60 or re.search(r"[?!]|니다|세요|해요|어요", value):
                    report["키워드로 보기엔 긴 Topic 항목 (넣지 않음)"].append(value[:50])
                elif value.lower() != talk["title"].lower() and value not in talk["keywords"]:
                    talk["keywords"].append(value)
        if kind in ("file", "pdf") and value:
            talk["files"].append(value)
    return out


sessions = db.get(
    "/rest/v1/activity_sessions?select=id,kind,title,notion_page_id,season_id"
    "&kind=in.(seminar,momentum)&notion_page_id=not.is.null&order=held_on"
)
plans = []  # (session, [talk rows])
counts = Counter()
for session in sessions:
    found = read_talks(children(session["notion_page_id"]), None, [])
    rows = []
    for position, talk in enumerate(found):
        if not talk["title"] and not talk["speakers"]:
            guess = next((f.split("_")[0] for f in talk["files"] if "_" in f), None)
            if guess:
                report["발표자가 비어 있고 파일 이름에만 이름이 있음 (적용 안 함)"].append(f"{session['title']}: {guess}")
            continue
        track = None
        if session["kind"] == "momentum" and talk["track"]:
            track = track_of.get(talk["track"].strip().lower())
            if not track:
                report["태그에 없는 트랙"].append(f"{session['title']}: {talk['track']}")
        rows.append({
            "source_key": "notion:" + talk["key"],
            "title": talk["title"],
            "keywords": talk["keywords"],
            "track_tag_id": track,
            "sort_order": position,
            "speakers": speaker_rows(talk["speakers"]),
        })
    if not rows:
        report["발표를 찾지 못한 회차"].append(session["title"])
    plans.append((session, rows))
    counts[session["kind"]] += len(rows)


# --- DeepIntoDeep: each season page's curriculum ------------------------------
seasons = {s["name"]: s["id"] for s in db.get("/rest/v1/seasons?select=id,name")}
# DeepIntoDeep sessions by run season and number (both stored; nothing read from titles).
d2d_sessions = db.get("/rest/v1/activity_sessions?select=id,title,number,program_runs(seasons(name))&kind=eq.deepintodeep")
number = lambda text: (re.search(r"(\d+)\s*(회|강)", text) or [None, None])[1]

d2d_pages = []
cursor = None
while True:
    body = {"query": "DeepIntoDeep", "filter": {"property": "object", "value": "page"}, "page_size": 100}
    if cursor:
        body["start_cursor"] = cursor
    page = notion.request("search", body)
    for result in page["results"]:
        title = next(("".join(t["plain_text"] for t in p["title"]) for p in result["properties"].values() if p["type"] == "title"), "").strip()
        match = re.match(r"^(?:20)?(\d{2}-(?:여름|겨울|1|2))\s+DeepIntoDeep$", title)
        if match and result["parent"]["type"] != "database_id":
            d2d_pages.append((match.group(1), result["id"]))
    if not page.get("has_more"):
        break
    cursor = page["next_cursor"]

for season_name, page_id in sorted(d2d_pages):
    tables = [b for b in children(page_id) if b["type"] == "table"]
    if not tables:
        report["커리큘럼 표가 없는 D2D 시즌"].append(season_name)
        continue
    in_run = [s for s in d2d_sessions if s["program_runs"] and s["program_runs"]["seasons"]["name"] == season_name]
    by_number = defaultdict(list)
    for s in in_run:
        by_number[str(s["number"])].append(s)
    for row in children(tables[0]["id"]):
        cells = text(row)
        lecture = number(cells[0]) if cells else None
        if not lecture:
            continue  # the header row
        topic, lecturer = (cells + ["", ""])[1:3]
        matches = by_number.get(lecture, [])
        if len(matches) != 1:
            report["D2D 커리큘럼 행에 맞는 회차가 없거나 여럿"].append(f"{season_name} {lecture}회 ({len(matches)}개)")
            continue
        session = matches[0]
        plans.append((session, [{
            "source_key": "notion:" + row["id"],
            "title": topic,
            "keywords": [],
            "track_tag_id": None,
            "sort_order": 0,
            "speakers": speaker_rows(split_names(lecturer)),
        }]))
        counts["deepintodeep"] += 1

# --- report and write --------------------------------------------------------------
print(f"발표: 세미나 {counts['seminar']}, 모멘텀 {counts['momentum']}, D2D 강의 {counts['deepintodeep']}")
for heading, lines in report.items():
    unique = sorted(set(lines))
    print(f"\n{heading} ({len(unique)})")
    for line in unique[:60]:
        print("  ", line)

if apply:
    for session, rows in plans:
        keep = [row["source_key"] for row in rows]
        for row in rows:
            speakers = row.pop("speakers")
            saved = db.upsert("session_talks", row | {"session_id": session["id"]}, "source_key")
            # Notion's speakers replace the stored ones; when Notion has none, the
            # speakers entered on the site (admin canvas) stay.
            if speakers:
                db.delete("session_talk_speakers", f"talk_id=eq.{saved['id']}")
                db.insert("session_talk_speakers", [s | {"talk_id": saved["id"]} for s in speakers])
        # Talks of this session no longer in Notion go (curriculum rows are per session too).
        if keep:
            quoted = ",".join(f'"{k}"' for k in keep)
            db.delete("session_talks", f"session_id=eq.{session['id']}&source_key=not.in.({quoted})")
    # Profiles list lectures by session; rebuild them now rather than within the hour.
    db.refresh_pages(["members"])
    print("\n반영했습니다.")
else:
    print("\n미리보기입니다. 쓰려면 --apply를 붙이세요.")
