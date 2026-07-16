# Orchid Clone Artifact

This directory contains the Orchid landing page clone built for handoff to another agent.

It is intentionally stored under `_agent_artifacts/orchid-clone/` instead of the site root. The GitHub Pages workflow for this repo only copies `index.html`, `privacy`, `terms`, `assets`, fonts, and selected root files into `dist`, so this artifact can be committed to GitHub without replacing the live homepage.

Run the local verifier from the repo root:

```bash
node scripts/verify-orchid-clone.mjs
```
