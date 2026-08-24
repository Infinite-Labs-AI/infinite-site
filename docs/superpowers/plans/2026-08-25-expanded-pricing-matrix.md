# Expanded Pricing Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an always-visible, 46-row Max/Ultra feature comparison beneath the existing compact homepage pricing cards.

**Architecture:** Preserve the current pricing cards and billing script. Replace the six-item shared band with a proof strip, an accessible role-based comparison table grouped into nine sections, and a closing CTA strip. Extend the existing homepage verifier so the matrix structure, exact Ultra-only assignments, proof counts, built output, and non-collapsible mobile contract fail closed.

**Tech Stack:** Static semantic HTML, scoped CSS, vanilla JavaScript for the existing billing toggle, Node.js contract verifier, static deployment builder.

## Global Constraints

- Use the exact 46 capabilities and plan assignments in `docs/superpowers/specs/2026-08-25-expanded-pricing-matrix-design.md`.
- Exactly five rows are Ultra-only: AI Visibility, Reels, Competitor Tracking, Landing-page A/B Testing, and Faceless YouTube Video Generation.
- Preserve the existing compact plan-card dimensions and the white Ultra CTA.
- Keep all nine groups visible on desktop and mobile; no accordions, disclosure controls, or horizontal scrolling.
- Preserve monthly and annual prices, 7-day trial copy, `/download` actions, and analytics placement markers.
- Do not modify `1bu-1`; it is a read-only product source for this task.
- Preserve unrelated working-tree changes.

---

### Task 1: Lock the expanded homepage contract

**Files:**
- Modify: `scripts/verify-infinite-option-10.mjs`

**Interfaces:**
- Consumes: the matrix contract in the approved design spec.
- Produces: source checks for `[data-pricing-proof]`, `[data-pricing-matrix]`, nine `[data-pricing-group]` elements, 46 `[data-pricing-feature]` rows, five `[data-ultra-only="true"]` rows, and `[data-pricing-closing-cta]`.

- [ ] Add a failing verifier block that asserts:
  - proof-strip text includes `21 product surfaces`, `79 agent tools`, and `One growth operating system`;
  - group IDs are `operator`, `leads`, `seo`, `ads`, `content`, `conversion`, `analytics`, `brand`, and `competitive`;
  - feature-row count is 46;
  - Ultra-only count is five and their labels exactly match the approved set;
  - no `<details>` or `data-collapsed` exists inside the matrix;
  - the matrix CSS defines a three-column desktop row and a one-column mobile row without `overflow-x: auto`.
- [ ] Run `node scripts/verify-infinite-option-10.mjs` and confirm it fails for the missing expanded matrix.

### Task 2: Build the proof strip, matrix, and closing CTA

**Files:**
- Modify: `_agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html`

**Interfaces:**
- Consumes: the exact group and row order from the design spec.
- Produces: accessible static markup using `role="table"`, `role="rowgroup"`, `role="row"`, `role="columnheader"`, and `role="cell"`.

- [ ] Remove the old `.pricing-shared` six-item band.
- [ ] Add the proof strip immediately below `.pricing-tier-grid`.
- [ ] Add a sticky matrix header with Feature, Max, and Ultra columns.
- [ ] Add all nine group sections and all 46 rows.
- [ ] Mark the five exclusives with `data-ultra-only="true"`; render an accessible neutral dash in Max and an `Ultra` pill in Ultra.
- [ ] Add a closing CTA strip with Max and Ultra labels and the existing `/download` CTA contract.
- [ ] Keep the existing trial reassurance beneath the closing CTA.
- [ ] Run `node scripts/verify-infinite-option-10.mjs` and expect only styling-contract failures to remain.

### Task 3: Style the dense comparison responsively

**Files:**
- Modify: `_agent_artifacts/infinite-option-4-desktop-tokens/scheme-variants.css`

**Interfaces:**
- Consumes: the matrix classes and data attributes from Task 2.
- Produces: a 980-pixel desktop comparison, sticky column header, subtle Ultra column tint, always-visible mobile rows, and final CTA strip.

- [ ] Add proof-strip styling as three compact equal-width stats.
- [ ] Add comparison header and row styling using `grid-template-columns: minmax(0, 1fr) 92px 112px`.
- [ ] Add grouped headings, alternating near-white rows, green inclusion checks, neutral Max dashes, and high-contrast Ultra pills.
- [ ] Add a sticky header offset below the site navigation only while the matrix is in view.
- [ ] At 760 pixels and below, switch every comparison row to `grid-template-columns: 1fr` and render the Max/Ultra cells in a labelled two-column sub-grid without horizontal scrolling.
- [ ] Preserve the current plan-card rules unchanged.
- [ ] Run the homepage verifier and expect it to pass.

### Task 4: Build, validate, preview, and publish the branch

**Files:**
- Verify: `_agent_artifacts/infinite-option-4-desktop-tokens/index-scheme-wrangle.html`
- Verify: `_agent_artifacts/infinite-option-4-desktop-tokens/scheme-variants.css`
- Verify: `scripts/verify-infinite-option-10.mjs`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: a validated `dist/` build, a local preview at `/#pricing`, and a pushed feature branch.

- [ ] Run `node scripts/verify-infinite-option-10.mjs`.
- [ ] Run `node --test .github/scripts/test-prepare-static-deploy.mjs`.
- [ ] Run `node --test .github/scripts/test-static-remediation.mjs`.
- [ ] Run `node scripts/prepare-static-deploy.cjs` after tests because the deploy test removes `dist/` in its cleanup.
- [ ] Verify `dist/index.html` contains nine groups, 46 rows, five Ultra-only rows, and no stale prices.
- [ ] Serve `dist/` locally and verify the root route returns HTTP 200.
- [ ] Commit only the plan, homepage source, homepage CSS, and verifier changes.
- [ ] Push `feature/2026-08-25-expanded-pricing-matrix`; do not merge to main without a separate user request.
