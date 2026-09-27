# Shluftzi Store Deployment — deploy notes

Interactive **Projects Manager** status UI for Apple App Store / Google Play pipeline.
Six stages: Prep → Build → Sign → Submit → Review → Release. Release / QA owns GO / NO-GO.

## Primary URLs (use these)

| What | URL |
|------|-----|
| **Hub (home-server, interactive)** | http://100.89.1.4:60142/ |
| **Shell** | http://100.89.1.4:60142/apps/shell.html |
| **Bake** | http://100.89.1.4:60142/apps/bake.html |
| **Prompt** | http://100.89.1.4:60142/apps/prompt.html |
| **Puk** | http://100.89.1.4:60142/apps/puk.html |
| **API health** | http://100.89.1.4:60142/api/health |
| **API apps** | http://100.89.1.4:60142/api/apps |

Home-server serves **static UI + API** on the same origin (`:60142`), so no CORS/mixed-content issues on the tailnet.

## Public mirror (GitHub Pages)

| What | URL |
|------|-----|
| **Pages hub** | https://shluftzi.github.io/store-deploy/ |
| **Shell** | https://shluftzi.github.io/store-deploy/apps/shell.html |
| **Bake** | https://shluftzi.github.io/store-deploy/apps/bake.html |
| **Prompt** | https://shluftzi.github.io/store-deploy/apps/prompt.html |
| **Puk** | https://shluftzi.github.io/store-deploy/apps/puk.html |
| **Repo** | https://github.com/Shluftzi/store-deploy |
| **Notion** | https://app.notion.com/p/3e81b15ab1d0811592d6e10e59361d9b |

Pages is static only. The browser calls the Tailscale API at `http://100.89.1.4:60142` (override via ⚙ Settings → `STORE_API` in localStorage). Prefer the home-server hub when editing status (same-origin, reliable).

Legacy static-only mirror (optional): http://100.89.1.4:60141/

## How status updates work

1. Open an app page (or hub detail).
2. Click a **stage** in the stepper → saved immediately (`POST /api/apps/{id}/stage`).
3. Toggle **Release QA** (Pending / GO / NO-GO) → saved immediately (`PATCH`).
4. Edit **Next needed / Blockers / Notes** → debounced save (~400ms) + save on blur.
5. Another client watching the same page **polls every ~2.5s** and picks up changes.
6. Backend: SQLite `~/projects/store-deploy-api/status.db` on home-server; `status.json` snapshot rewritten on each change.

### API (curl examples)

```bash
curl -s http://100.89.1.4:60142/api/health
curl -s http://100.89.1.4:60142/api/apps
curl -s -X PATCH http://100.89.1.4:60142/api/apps/shell \
  -H 'Content-Type: application/json' \
  -d '{"notes":"example","qa":"NO-GO","stage":"Prep"}'
curl -s -X POST http://100.89.1.4:60142/api/apps/shell/stage \
  -H 'Content-Type: application/json' \
  -d '{"stage":"Build"}'
```

## Ops (home-server)

- Host: `grokbots@100.89.1.4` (Tailscale)
- Code: `~/projects/store-deploy-api/` (FastAPI + SQLite + `static/`)
- systemd user unit: `pm-store-deploy-api` (linger enabled)
  - `systemctl --user status pm-store-deploy-api`
  - `systemctl --user restart pm-store-deploy-api`
- Port: **60142** (PM range 60100–60200)

## Frontend deploy (Pages)

From this repo (`Shluftzi/store-deploy`):

1. Update files in repo root (`index.html`, `styles.css`, `shared.js`, `app.js`, `apps/*.html`).
2. Commit + push `main`.
3. GitHub Pages serves from `main` `/`.
4. Mirror the same tree into home-server `~/projects/store-deploy-api/static/` and restart is usually **not** required (static files are read from disk).

## Ownership

- **Projects Manager** owns this status site and the API.
- **Release / QA** owns GO / NO-GO for store submissions.
