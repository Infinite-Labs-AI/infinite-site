# infinite.fast public website

This repository is the public website source for [infinite.fast](https://infinite.fast/). It is not the source for the Infinite desktop app. Desktop downloads use the canonical [`/download`](https://infinite.fast/download) route; public engine source lives in [Infinite OS](https://github.com/Infinite-Labs-AI/infinite-os).

## Local verification

Install the reviewed dependencies:

```bash
npm ci
```

The public route graph owns the sitemap, `llms.txt`, middleware document inventory, and sitewide footer. Check its tracked snapshots without changing the checkout:

```bash
node scripts/render-site-graph.mjs --check
```

Run the focused public contracts:

```bash
node .github/scripts/test-public-site-graph.mjs
node .github/scripts/test-agent-install-surface.mjs
node .github/scripts/test-prepare-static-deploy.mjs
node scripts/verify-site-audit.mjs
```

The build generates the launch-video route from a public dataset. Its built-output contracts are fixture-backed: each test starts a local dataset fixture, runs the real static deploy, checks `dist`, and removes `dist` before exiting.

## Source and build ownership

- Homepage source: `_agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html`
- Agent ecosystem: `agents/index.html`
- Public route manifest: `scripts/lib/public-site-manifest.mjs`
- Static deploy builder: `scripts/prepare-static-deploy.cjs`
- Generated root snapshots: `sitemap.xml` and `llms.txt`

Use `node scripts/render-site-graph.mjs --write` only when intentionally changing manifest-backed public copy or routes, then commit the generated snapshots with their source.

## Deployment

Vercel owns production deployment for `infinite.fast`. Changes merge through the protected `main` branch and the existing GitHub checks. GitHub Pages is not a deployment target for this repository.
