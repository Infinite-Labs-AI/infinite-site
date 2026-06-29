# Archived designs

Snapshots of previous versions of the Infinite landing page, kept for
reference. **These are not part of the live site.**

## Why these aren't served online

GitHub Pages for this repo is built by `.github/workflows/deploy-pages.yml`,
which copies an explicit allow-list of files into the published `dist/`
directory (`index.html`, `privacy`, `terms`, `assets`, `fonts`, icons,
`logo.png`, `LICENSE`). Anything not on that list — including this
`archived/` folder — is never uploaded to Pages, so it cannot be reached at
`infinite-labs-ai.github.io/infinite-site/`.

If the deploy method ever changes to "deploy from a branch" (serving the repo
root directly), this folder would need to be excluded another way (e.g. a
`_config.yml` `exclude:` entry, or renaming it with a leading underscore).

## Contents

- `2026-06-pre-obsidian-redesign/index.html` — the landing page as it existed
  at commit `8aaed79`, immediately before the Obsidian-style nav + hero
  redesign (`bca0c79`). It references root-level assets (`logo.png`, favicons,
  `privacy/`, `terms/`), so to view it as originally rendered, serve it from
  the repo root rather than opening the file in place.
