# Shluftzi Store Deployment — deploy notes

## URLs

| What | URL |
|------|-----|
| **GitHub Pages (public)** | https://shluftzi.github.io/store-deploy/ |
| **GitHub repo** | https://github.com/Shluftzi/store-deploy |
| **Notion (source of truth)** | https://app.notion.com/p/3e81b15ab1d0811592d6e10e59361d9b |
| **Home-server mirror (tailnet)** | http://100.89.1.4:60141/ |

## Deploy steps (done 2026-09-27)

1. Static site (vanilla `index.html` + `styles.css`) in this repo root.
2. Pushed to `main` on `Shluftzi/store-deploy` (public).
3. GitHub Pages enabled: legacy build from `main` `/`.
4. Verified Pages returns HTTP 200.
5. Optional mirror: copied static files to `~/projects/store-deploy-site` on home-server (`grokbots@100.89.1.4`) and served with Python on port **60141**.

## Ownership

- **Projects Manager** owns this status site.
- **Release / QA** owns GO / NO-GO for store submissions.
