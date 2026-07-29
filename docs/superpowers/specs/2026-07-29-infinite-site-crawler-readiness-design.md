# Infinite Site Crawler Readiness Design

**Date:** 2026-07-29
**Status:** Approved
**Surfaces:** `infinite.fast` and `blog.infinite.fast`

## Goal

Keep Infinite's public website and blog explicitly available to legitimate search,
AI-search, grounding, and training crawlers while preventing crawler-policy drift.

## Main Site

- Keep ordinary search crawlers allowed through `User-agent: *`.
- Explicitly allow OAI-SearchBot, GPTBot, Claude-SearchBot, ClaudeBot,
  PerplexityBot, Google-Extended, and CCBot.
- Repeat the main site's private machine-route exclusions in every named group.
- Exclude `/api/` and `/ingest/`; both are machine endpoints rather than public
  content.
- Expand `llms.txt` into a concise product and canonical-resource map.
- Keep sitemap `lastmod` values honest for changed pages.
- Add a bounded readiness verifier that checks live robots rules, sitemap URLs,
  response status, raw HTML, canonical state, noindex state, and expected
  structured metadata.

## Blog

- Keep the existing registry-driven crawler policy.
- Add the synthesized blog homepage to the dedicated blog-domain sitemap even
  when no stored `blog` page exists.
- Give `blog.infinite.fast/llms.txt` an Infinite-specific product description and
  canonical links while preserving generic output for other customer domains.

## Non-Goals

- No changes to the Infinite desktop citation-intervention product.
- No automated Reddit, YouTube, or AEO experiment work.
- No claim that `llms.txt` is a ranking or citation signal.
- No blocking of model-training crawlers.
- No homepage marketing-copy changes.

## Verification

- Static source tests must prove every explicit robots group repeats exclusions.
- The main deployment verifier must validate both domains and every sitemap URL.
- Blog unit tests must prove the homepage sitemap entry and Infinite-specific
  `llms.txt` output without changing other hosts.
