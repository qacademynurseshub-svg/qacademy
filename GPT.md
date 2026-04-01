# GPT.md — QAcademy Nurses Hub

Instructions for ChatGPT when working on this repo.

## Session Start Routine
1. Pull latest from git
2. Read `BUILD_LIST.md` for current priorities
3. Scan recent commits (`git log --oneline -10`) to understand what changed since last session
4. Read `README.md` for project context, stack, conventions, and page reference
5. Read `db/schema.sql` if working on anything database-related

## Session End Routine
1. Commit all work with clear commit messages
2. Push to main
3. Update `BUILD_LIST.md` if items were completed or new ones discovered
4. Update `README.md` if new pages, features, or conventions were added

## Working With Me
- I have no coding experience. Before writing or pushing any code, explain the rationale — what the code does, why it's structured that way, and what it changes. Do not assume I can read code.
- Always push directly to main. No PRs or feature branches.

## Key Files to Know
- `README.md` — full project docs, stack, conventions, page reference
- `BUILD_LIST.md` — current priorities (5-sprint hardening plan)
- `CLONING.md` — technical rebuild guide
- `db/schema.sql` — single source of truth for all 36 database tables
- `js/paths.js` — central path config, never hardcode product paths in JS
- `js/config.js` — Supabase credentials
- `js/guard.js` — auth and role guards
- `js/mynmclicensure-api.js` — licensure data layer
- `js/myteacher-api.js` — teacher assess data layer
- `CLAUDE.md` — instructions for Claude Code (similar to this file)

## Conventions
- Supabase JS CDN uses `supabase` as global. Project uses `const db = supabase.createClient(...)` in `js/config.js`. All files reference `db`, never `supabase`.
- Use `.maybeSingle()` instead of `.single()` on queries where result might be empty.
- Never hardcode `/mynmclicensure/...` or `/myteacher/...` paths in JavaScript. Always use `LICENSURE.x` or `MYTEACHER.x` from `js/paths.js`.
- Item IDs are globally unique and course-prefixed: `GP_001`, `RN_MED_001`, etc.
- User IDs are TEXT format: `U_` + random string (not UUID).

## Two AI Assistants
This repo is worked on by both Claude Code and ChatGPT. Each has its own instruction file:
- `CLAUDE.md` — Claude Code instructions
- `GPT.md` — ChatGPT instructions (this file)

Both follow the same conventions and push to main. Check recent commits to see what the other assistant changed before starting work.
