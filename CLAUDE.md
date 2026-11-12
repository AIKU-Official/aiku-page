@AGENTS.md

# AIKU homepage: working rules

The site is AIKU's public homepage and its internal management tool. The owner is the society's president; they review on the live site, often from a phone. Reply to them in Korean.

## How to work

- **Think through the whole flow.** When asked for one change, handle the connected cases too (success, failure, retry, signed in or out, coming back later, phone and desktop) without being asked.
- **Same kind of thing, same behaviour.** When one card, panel or control gets a behaviour, give every equivalent one the same behaviour on every screen size (e.g. project and member cards both open a page on phones and an unfolding panel on wider screens). Check the siblings before calling a change done.
- **Verify before reporting.** Drive the change in a real browser with Playwright (desktop 1280 and phone 390), look at the screenshot, and say what was and was not checked. Temporary scripts go in `tests/.<name>.mjs` and are deleted afterwards; screenshots go to the scratchpad, not the repo.
- **Deploy after each verified change.** Commit and push to `main` (Vercel deploys it), then confirm the live site shows it. Commit messages are plain English and say what changed and why.
- **Production database.** Schema changes and bulk writes to production need the owner's go-ahead in the conversation. A change whose code depends on a new table or column is pushed only after the migration is applied, or the live page breaks.
- **Read `node_modules/next/dist/docs/` before using a Next.js API you have not used in this repo.**

## Data

- **Nothing that is content lives in the source.** Projects, members, profiles, seasons and news are rows in Supabase, in one uniform shape. Page copy that explains the society (About, Activity, Curriculum) is the exception.
- **Keep the schema hierarchical.** `seasons → projects → project_members → members → generations`; each member owns `member_profiles`, `member_student_ids`, `member_accounts`, `member_positions`; `aikuthons` owns `aikuthon_partners`, `aikuthon_tracks` and `aikuthon_awards → aikuthon_award_members → members`. New data gets its own table with foreign keys rather than a text column to parse. Every migration starts with a comment that draws where the table sits and says who may read and write it.
- **After a migration:** apply it locally, regenerate `src/lib/supabase/database.types.ts`, and state in the commit what it adds.
- **Independence from Notion is the point of this site.** No Notion links, no Notion-hosted files. Images and slides live in Supabase Storage; slides are offered as PDF only.
- **Imports are scripts, not manual edits.** They are keyed so that running them again updates rather than duplicates, start with a dry run, and write a report of what could not be matched.

## Privacy and secrets

- `data/` holds personal data and is never committed. `.env*.local` files are never committed and their values are never printed.
- Student IDs exist in the database only as keyed hashes. The public roster shows name, department, generation, grade and the president / vice-president title, nothing else.
- Points and attendance records are visible only to the member they belong to, never publicly.
- A member's profile is private until they make it public. Profile pictures are only the ones a member uploaded; pictures from Google or GitHub are not used.
- Receipts, ledgers and application forms may be read to find facts, but account numbers, phone numbers, signatures and the like are never copied anywhere.

## Members and sign-in

- One person, one member: an AIKU ID, Google and GitHub all link to the same roster member. Identity is checked with name, joining generation (`가입 기수`) and student ID; replies never say which field was wrong.
- Members two or more generations behind the newest are OB automatically (database trigger) unless pinned.
- Project participants are matched to roster members by name and shown under their roster name. A match that is a guess is reported to the owner, not applied silently.

## Design

- White base, restrained, with the tokens in `src/app/globals.css`. Breakpoints are desktop-first: `max-lg:` below 981px, `max-sm:` below 561px. On phones the root font size is reduced, so size things in rem.
- Tag colours: 회장 amber, 부회장 silver; 주니어 sprout green, 시니어 sky, OB sand; prizes gold, silver, bronze for 1등, 2등, 3등. Selected filters are neutral grey; a prize filter wears its medal colour.
- Sibling controls behave alike in every state: selected, hover, focus, disabled. Inputs and buttons in one form are the same height.
- Page heroes keep one height and the same background above and below their divider. Profile pages have no hero.
- Progress is shown on the button that was pressed (its label changes and the form's buttons are disabled), not in a separate status box. A box is for errors.
- Every detail page (a project, a profile, my profile and its editor) starts with `BackLink` (`src/components/navigation/BackLink.tsx`): it goes back step by step along the tab's trail of pages, labelled with the previous page's title, and falls back to the parent list when the page was opened directly. The site's own navigation (header, logo, account menu, footer) starts a new trail, so a page reached from it offers no way back. New detail pages and new navigation links use these too (`SiteNavLink` for the latter).
- Detail views open as a centre peek over a blurred page, full screen on phones (`src/components/ui/CenterPeek.tsx`). A card opens by unfolding in place, with its content at real size the whole way; no scaling tricks.
- Copy is plain Korean. Avoid Konglish; use English where the navigation does (`Contact`, `Members`). Use one word for one thing across the site.
