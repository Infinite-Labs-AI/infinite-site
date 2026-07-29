# Infinite Site Crawler Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Infinite's main site and blog crawler policy explicit, keep discovery files accurate, and continuously verify effective AI-search readiness.

**Architecture:** The static main site keeps policy in committed text files and gains a Node-based live readiness verifier. The Next.js blog continues to generate discovery files from typed helpers, with the synthesized blog index represented explicitly in sitemap output and an Infinite-only `llms.txt` profile.

**Tech Stack:** Static HTML, Node.js assertions and fetch, Next.js 16 metadata routes, TypeScript, Vitest.

## Global Constraints

- Public content remains available to search, retrieval, grounding, and training crawlers.
- Every named robots group repeats its private-route exclusions.
- `llms.txt` remains a concise discovery map, not a ranking claim.
- Generic customer-domain behavior in `1bu-1` must not become Infinite-branded.
- Homepage marketing copy must not change.

---

### Task 1: Main-Site Crawler Policy and Discovery Files

**Files:**
- Modify: `.github/scripts/test-static-remediation.mjs`
- Modify: `robots.txt`
- Modify: `llms.txt`
- Modify: `sitemap.xml`
- Modify: `scripts/verify-site-audit.mjs`

**Interfaces:**
- Consumes: committed static discovery files.
- Produces: explicit crawler groups and accurate static metadata.

- [ ] Add assertions that every supported crawler group contains `Allow: /`,
  `Disallow: /api/`, and `Disallow: /ingest/`.
- [ ] Run the static remediation test and confirm it fails against the existing
  OAI-only policy.
- [ ] Add the required groups and repeated exclusions to `robots.txt`.
- [ ] Expand `llms.txt` with product identity and canonical resource links.
- [ ] Update the homepage sitemap date to its latest content change.
- [ ] Replace the obsolete review-first homepage assertion with current approved
  copy assertions.
- [ ] Run the static tests and confirm they pass.

### Task 2: Live Readiness Verification

**Files:**
- Create: `scripts/verify-crawler-readiness.mjs`
- Modify: `.github/workflows/verify-live-analytics.yml`

**Interfaces:**
- Consumes: `https://infinite.fast` and `https://blog.infinite.fast` robots and
  sitemap output.
- Produces: a failing process exit when public content is blocked, incomplete,
  non-canonical, noindexed, or absent from expected sitemap coverage.

- [ ] Add a deterministic test seam for parsing and validating fixture HTML.
- [ ] Confirm the new verifier fails against an intentionally invalid fixture.
- [ ] Implement bounded fetches, robots group validation, sitemap parsing, raw
  HTML heading/body checks, canonical/noindex checks, and structured-data checks.
- [ ] Add the verifier to the existing scheduled/live verification workflow.
- [ ] Run fixture and live verification successfully.

### Task 3: Blog Homepage Sitemap Entry

**Files:**
- Modify: `src/app/custom-domain/__tests__/sitemap.test.ts`
- Modify: `src/app/custom-domain/sitemap-helpers.ts`

**Interfaces:**
- Consumes: published pages and dedicated-blog-domain state.
- Produces: a root sitemap entry dated from the newest published page when the
  synthesized index has no stored page.

- [ ] Add a failing test for a dedicated blog domain containing `/` plus article
  URLs without a stored `blog` row.
- [ ] Implement root-entry insertion without duplicates.
- [ ] Run the sitemap tests and confirm they pass.

### Task 4: Infinite Blog `llms.txt`

**Files:**
- Modify: `src/app/custom-domain-llms.txt/__tests__/route.test.ts`
- Modify: `src/app/custom-domain-llms.txt/route.ts`

**Interfaces:**
- Consumes: verified custom-domain host and workspace metadata.
- Produces: Infinite-specific discovery text only for `blog.infinite.fast`.

- [ ] Add a failing route test for Infinite product identity and canonical links.
- [ ] Preserve the existing generic customer-domain test.
- [ ] Add a host-specific Infinite profile with product, site, blog, tools,
  comparisons, download, sitemap, and RSS links.
- [ ] Run the focused route tests and confirm they pass.

### Task 5: Cross-Repo Verification

**Files:**
- Verify all modified files in both worktrees.

**Interfaces:**
- Consumes: completed changes from Tasks 1-4.
- Produces: clean focused diffs with passing static, unit, type, and live checks.

- [ ] Run main-site static deployment and audit tests.
- [ ] Run blog sitemap, llms, crawler-registry, lint, and type checks for changed
  files.
- [ ] Run the live readiness verifier against both production domains.
- [ ] Check both diffs for unrelated changes and whitespace errors.
