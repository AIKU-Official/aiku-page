#!/usr/bin/env python3
"""Loads the project pages prepared under data/notion/projects into Supabase.

    python3 scripts/import-notion-projects.py .env.local            # dry run: report only
    python3 scripts/import-notion-projects.py .env.local --apply    # write

Each project directory holds meta.json (Notion properties), final.md (the page
rewritten in the unified format), images/ and files/. A project is keyed by its
Notion page id, so running this again updates rather than duplicates. Images
and the presentation are uploaded to the aiku-uploads bucket and the Markdown
is rewritten to point at them. Participants are linked to roster members by
name; names that cannot be matched with confidence stay as plain text and are
listed in the report (data/notion/import-report.json).
"""
import json, os, re, sys, mimetypes, unicodedata, urllib.request, urllib.error, urllib.parse

ROOT = "data/notion/projects"
BUCKET = "aiku-uploads"
IMAGE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif"}
MAX_BYTES = 50 * 1024 * 1024
TERM_ORDER = {"겨울": 0, "1": 1, "여름": 2, "2": 3}
# Notion accounts shown under a romanised name or a nickname. Used only when the
# roster has exactly one member with the Korean name; reported as uncertain.
ALIASES = {"Chaehyun Kim": "김채현", "ChangWoo Yoo": "유창우", "Minjae Kim": "김민재", "Sangmin Hwang": "황상민",
           "SeoHyeon Chang": "장서현", "Seunggi Moon": "문승기", "kukyoung": "장국영", "줴윤줴윤": "이제윤",
           # Given name only, with two members of that name: the one active in the project's season.
           "혜진": "엄혜진", "승주": "오승주", "MinGyeong": "김민경"}
# One spelling per tag, so the tag filter does not list the same field twice.
TAG_SPELLING = {"DIffusion": "Diffusion", "Multi-modal": "Multimodal", "Represenation Learning": "Representation Learning",
                "audio": "Audio", "machine learning": "Machine Learning", "financial engineering": "Financial Engineering",
                "Few-shot learning": "Few-shot Learning", "Prompt learning": "Prompt Learning", "LLM Agent": "AI Agent"}
# Placings taken from the society's prize receipts and accounting ledgers, where
# the recipient is the team leader; these win over what a page says about
# itself. None clears a claim the accounts contradict (LAPD's page says 대상,
# but the 24-1 receipts, ledger and score sheet all put other teams first).
# Winners whose project is not among the imported pages are simply absent:
# 25-여름 1등, 24-2 1·2등, 24-여름 3등, 24-1 3등, 24-겨울 2등; 23-2 is not settled.
KNOWN_AWARDS = {
    "그래서 세 줄 요약 좀;;": 1, "너 정말 핵심을 찔렀어.": 2, "DACON 대회": 3,                      # 26-여름 (points log)
    "양자양자": 1, "RICE: Reference-guided Internal Cross-lingual Erasure": 2, "분포가 다른 TEST SET 정복하기": 3,  # 26-1
    "PIRETS": 1, "데이터 분석 agent 만들어서 공모전 Ssalmuck하기": 2, "AIMO (AI Mathematical Olympiad)": 3,      # 26-겨울
    "2025 Samsung AI Challenge & Robotics": 1, "Storyboarder": 2, "Hebrew Retrieval Challenge 2025": 3,           # 25-2
    "Easy, fast, and cheap LLM serving for everyone": 2, "Doodle to Magic": 3,                                     # 25-여름
    "HanCLIP": 1, "Small Korean VLM": 2, "Voice To Latex": 3,                                                      # 25-1 (ledger)
    "나만의 이모지 만들기": 1, "Pont (Personalized font)": 2, "노래하는 즐거움, 아이쿠": 3,                       # 25-겨울 (ledger)
    "우리집 고양이도 메리 크리스마스": 3,                                                                          # 24-2
    "패션의 완성은 그림": 1, "아이쿠 공식계정보다 야구 영상이 더 많은 팔로워 얻을거라고 증명하기": 2,              # 24-여름
    "KoreaDenseRetrieval": 1, "욕쟁이 KoMo": 2,                                                                    # 24-1
    "디풋젼으로 사진 잘 찍는다고 소문나자": 1, "개강추 (개인화 강의 추천시스템)": 3,                               # 24-겨울
    "LAPD: Large language model Alignment through Persona Dynamics": None,
}

env_file, apply = sys.argv[1], "--apply" in sys.argv
env = dict(l.strip().split("=", 1) for l in open(env_file) if "=" in l and not l.startswith("#"))
URL = env["NEXT_PUBLIC_SUPABASE_URL"].strip('"')
KEY = (env.get("SUPABASE_SECRET_KEY") or env["SUPABASE_SERVICE_ROLE_KEY"]).strip('"')


def call(method, path, body=None, headers=None, raw=None):
    h = {"apikey": KEY, "Authorization": "Bearer " + KEY, **(headers or {})}
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    if raw is None and body is not None:
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(URL + path, method=method, data=data, headers=h)
    try:
        text = urllib.request.urlopen(req, timeout=300).read().decode()
        return json.loads(text) if text else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path.split('?')[0]} failed: {e.code} {e.read().decode()[:300]}")


def clean_name(raw):
    """'김상엽[ 학부재학 / 컴퓨터학과 ]' -> '김상엽'; '규민 김' -> '김규민'."""
    name = unicodedata.normalize("NFKC", raw or "")
    name = "".join(ch for ch in name if unicodedata.category(ch)[0] != "C")
    name = re.sub(r"\[.*?\]|\(.*?\)", "", name).strip()
    parts = name.split()
    if len(parts) == 2 and all(re.fullmatch(r"[가-힣]+", p) for p in parts) and len(parts[1]) == 1:
        name = parts[1] + parts[0]  # Notion shows some accounts as "given family"
    return re.sub(r"\s+", "", name) if re.fullmatch(r"[가-힣\s]+", name) else name


def season_key(name):
    year, term = name.split("-", 1)
    return (int(year), TERM_ORDER.get(term, 9))


def main():
    work = json.load(open("data/notion/worklist.json"))
    results = {}
    if os.path.exists("data/notion/results.json"):
        results = {r["id"]: r for r in json.load(open("data/notion/results.json"))}

    tag_overrides = {}
    if os.path.exists("data/notion/tag-overrides.json"):
        tag_overrides = json.load(open("data/notion/tag-overrides.json"))
    # Team members a Notion page left out, recorded elsewhere (e.g. the points
    # ledger lists every member of a prize-winning team). Keyed by page id.
    member_overrides = {}
    if os.path.exists("data/notion/member-overrides.json"):
        member_overrides = json.load(open("data/notion/member-overrides.json"))

    members = call("GET", "/rest/v1/members?select=id,name,generations(name)")
    by_name = {}
    for m in members:
        by_name.setdefault(m["name"], []).append(m)
    by_given = {}
    for m in members:
        by_given.setdefault(m["name"][1:], []).append(m)

    def match(raw, season):
        name = clean_name(raw)
        found = by_name.get(name, [])
        if len(found) == 1:
            return name, found[0]["id"], "exact"
        if len(found) > 1:
            # Same name in two generations: the later one for recent seasons.
            year = season_key(season)[0] if season else 0
            ordered = sorted(found, key=lambda m: int(re.sub(r"\D", "", m["generations"]["name"]) or 0))
            pick = ordered[-1] if year >= 26 else ordered[0]
            return name, pick["id"], "same name twice (picked %s)" % pick["generations"]["name"]
        alias = by_name.get(ALIASES.get(name, ""), [])
        if len(alias) == 1:
            return alias[0]["name"], alias[0]["id"], "romanised name or nickname"
        given = by_given.get(name, []) if re.fullmatch(r"[가-힣]{2}", name) else []
        if len(given) == 1:
            return given[0]["name"], given[0]["id"], "given name only"
        return name, None, "unmatched"

    report = {"projects": [], "unmatched_people": {}, "uncertain_people": {}, "skipped_files": [], "missing_final": []}
    seasons = {s["name"]: s["id"] for s in call("GET", "/rest/v1/seasons?select=id,name")}
    wanted = set()
    plan = []
    for item in work:
        d = os.path.join(ROOT, item["id"])
        meta = json.load(open(os.path.join(d, "meta.json")))
        final = os.path.join(d, "final.md")
        if not os.path.exists(final):
            # No write-up exists (the Notion page is an unfilled template): the
            # project is still listed with its title, tags, people and files.
            report["missing_final"].append(meta["title"])
        res = results.get(item["id"], {})
        season_list = meta["seasons"] or meta.get("seasons_inferred") or []
        if not season_list and (meta.get("date") or "").startswith("2026-06"):
            season_list = ["26-1"]  # presented at the 26-1 conference; the page has no season tag
        if not season_list:
            report["projects"].append({"title": meta["title"], "skipped": "no season"})
            continue
        season = sorted(season_list, key=season_key)[-1]
        wanted.add(season)
        title = (meta["title"] or "").strip()
        if not title or title.startswith("프로젝트 양식"):
            title = (res.get("title") or "").strip() or "(제목 없음)"
        known = next((t for t in KNOWN_AWARDS if title.startswith(t) or t.startswith(title)), None)
        rank = KNOWN_AWARDS[known] if known else None
        text = res.get("award_text") or ""
        if known is None and text and not res.get("award_is_placeholder"):
            m = re.search(r"([123])\s*(?:등|위)", text)
            # "대상" is the grand prize, i.e. first place.
            rank = int(m.group(1)) if m else (1 if re.search(r"대상\s*수상", text) else None)
        link = res.get("github_url") or meta.get("link") or ""
        plan.append(dict(dir=d, meta=meta, season=season, title=title, rank=rank,
                         github=link if re.match(r"https?://(www\.)?github\.com/", link or "") else None,
                         award_text=text, one_line=(res.get("one_line") or "").strip()))

    ordered = sorted(wanted | set(seasons), key=season_key, reverse=True)
    if apply:
        for name in ordered:
            if name not in seasons:
                seasons[name] = call("POST", "/rest/v1/seasons", {"name": name}, {"Prefer": "return=representation"})[0]["id"]
        # The database orders seasons by year and term; nothing to set here.

    existing = {p["notion_page_id"]: p["id"] for p in call("GET", "/rest/v1/projects?select=id,notion_page_id&notion_page_id=not.is.null")}

    for order, p in enumerate(sorted(plan, key=lambda p: (p["rank"] or 9, p["title"]))):
        meta, d = p["meta"], p["dir"]
        final = os.path.join(d, "final.md")
        markdown = open(final).read().strip() + "\n" if os.path.exists(final) else ""
        # Tags from Notion; for pages without any, the ones chosen from the write-up.
        fields = meta.get("fields") or tag_overrides.get(meta["notion_id"], [])
        tags = list(dict.fromkeys(TAG_SPELLING.get(f, f) for f in fields))
        row = {"season_id": seasons.get(p["season"]), "title": p["title"], "markdown": markdown,
               "github_url": p["github"], "one_line": p["one_line"], "award_rank": p["rank"], "notion_page_id": meta["notion_id"], "sort_order": order}
        entry = {"title": p["title"], "season": p["season"], "award_rank": p["rank"], "award_text": p["award_text"],
                 "images": len(meta["images"]), "chars": len(markdown)}
        missing = [i["file"] for i in meta["images"] if markdown.count(f"({i['file']})") != 1]
        if missing:
            entry["images_not_placed_once"] = missing

        people = []
        seen = set()
        extra = member_overrides.get(meta["notion_id"], {}).get("members", [])
        for role, raws in (("leader", meta.get("leaders") or []), ("member", (meta.get("members") or []) + extra)):
            for raw in raws:
                if not raw or clean_name(raw) in ("AIKU", ""):
                    continue
                name, member_id, how = match(raw, p["season"])
                if name in seen:
                    continue
                seen.add(name)
                people.append({"name": name, "member_id": member_id, "role": role, "sort_order": len(people)})
                if how == "unmatched":
                    report["unmatched_people"].setdefault(name, []).append(p["title"])
                elif how != "exact":
                    report["uncertain_people"].setdefault(f"{clean_name(raw)} -> {name} ({how})", []).append(p["title"])
        entry["people"] = len(people)

        if apply:
            pid = existing.get(meta["notion_id"])
            if pid:
                call("PATCH", f"/rest/v1/projects?id=eq.{pid}", row)
            else:
                pid = call("POST", "/rest/v1/projects", row, {"Prefer": "return=representation"})[0]["id"]
            call("POST", "/rest/v1/rpc/set_project_tags", {"p_project_id": pid, "p_names": tags})
            for image in meta["images"]:
                path = os.path.join(d, image["file"])
                ext = os.path.splitext(path)[1].lower()
                if ext not in IMAGE_TYPES or os.path.getsize(path) > MAX_BYTES:
                    report["skipped_files"].append(f"{p['title']}: {image['file']}")
                    continue
                key = f"projects/{pid}/{os.path.basename(path)}"
                call("POST", f"/storage/v1/object/{BUCKET}/{key}", raw=open(path, "rb").read(),
                     headers={"Content-Type": IMAGE_TYPES[ext], "x-upsert": "true"})
                markdown = markdown.replace(f"({image['file']})", f"({key})")
            update = {"markdown": markdown}
            # The slides are offered as a PDF only: one from Notion if the page had
            # it, else the PDF made from the PowerPoint file (same name, .pdf).
            listed = [x for x in meta.get("presentations") or [] if x.get("file")]
            choice = next((x for x in listed if x["file"].lower().endswith(".pdf")), None)
            if choice is None:
                for pres in listed:
                    made = os.path.splitext(pres["file"])[0] + ".pdf"
                    if os.path.exists(os.path.join(d, made)):
                        choice = {"file": made, "name": os.path.splitext(pres["name"])[0] + ".pdf"}
                        break
            if choice and os.path.getsize(os.path.join(d, choice["file"])) <= MAX_BYTES:
                key = f"projects/{pid}/{os.path.basename(choice['file'])}"
                call("POST", f"/storage/v1/object/{BUCKET}/{key}", raw=open(os.path.join(d, choice["file"]), "rb").read(),
                     headers={"Content-Type": "application/pdf", "x-upsert": "true"})
                update.update({"presentation_path": key, "presentation_name": choice["name"]})
            else:
                update.update({"presentation_path": None, "presentation_name": None})
                if listed:
                    report["skipped_files"].append(f"{p['title']}: {listed[0]['name']}")
            # PowerPoint files uploaded by an earlier run are no longer referenced.
            stale = [f"projects/{pid}/{os.path.basename(x['file'])}" for x in listed
                     if x["file"].lower().endswith((".ppt", ".pptx"))]
            if stale:
                call("DELETE", f"/storage/v1/object/{BUCKET}", {"prefixes": stale})
            call("PATCH", f"/rest/v1/projects?id=eq.{pid}", update)
            call("DELETE", f"/rest/v1/project_members?project_id=eq.{pid}")
            if people:
                call("POST", "/rest/v1/project_members", [{**person, "project_id": pid} for person in people])
            print(f"  {p['season']:6} {p['title'][:40]}", flush=True)
        report["projects"].append(entry)

    json.dump(report, open("data/notion/import-report.json", "w"), ensure_ascii=False, indent=1)
    done = [e for e in report["projects"] if "skipped" not in e]
    print(f"{'applied' if apply else 'dry run'}: {len(done)} projects, {len(report['missing_final'])} without final.md, "
          f"{len(report['unmatched_people'])} unmatched people, {len(report['uncertain_people'])} uncertain, "
          f"{len(report['skipped_files'])} skipped files, awards: "
          + str(sorted((e['season'], e['award_rank'], e['title'][:20]) for e in done if e['award_rank'])))


main()
