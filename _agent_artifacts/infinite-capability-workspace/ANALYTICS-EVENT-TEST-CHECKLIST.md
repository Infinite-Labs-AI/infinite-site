# Analytics Event Test Checklist — brand-website-refresh

Purpose: verify every analytics event fires correctly on the redesigned site before it goes live.

## ⚠️ Preview vs production — READ FIRST

The four analytics lanes are deliberately gated. **Two of the four cannot be tested on a `*.vercel.app` preview URL** — they are hard-gated to `VERCEL_ENV === "production"` AND the production host (`infinite.fast` / `www.infinite.fast`):

| Lane | Fires on preview? | Why |
|---|---|---|
| **Edge / server** (document_request, download_attempt) | ❌ NO | `middleware.js` returns early unless `VERCEL_ENV==="production"` + prod host (lines 33/141/183) |
| **First-party ledger** (site_page_view, site_click, app_download_click, sign_up_click) | ❌ NO | infinite-tag runtime only collects on `productionHosts`; no `siteSourceKey` on non-prod builds |
| **Consent banner** (GPC/DNT visitors) | ❌ NO | host-gated to prod hosts (`inject-analytics.cjs` `privacyConsentPromptSnippet`) |
| **GA4** (gtag) | ⚠️ FIRES — but into the PROD property | consent gate is NOT host-gated; token defaults to prod `G-JE3BZS61FZ` |
| **PostHog** | ⚠️ FIRES — but into the PROD project | same; token defaults to prod `phc_wUuv…` |
| **Meta / X pixels** | ❌ NO | not configured (no `INFINITE_META_PIXEL_ID` / `X_PIXEL_ID`) |

Also: the preview URL has **Vercel Deployment Protection** (SSO) — only a logged-in chaos-edge team member can open it.

**Conclusion:** full end-to-end event verification (especially the first-party ledger — the product's differentiator — and the server/edge truth lanes) **requires production**. Testing GA4/PostHog on preview would send test hits into the real GA4 property + PostHog project (polluting data) and still leaves 2 of 4 lanes untested. → A production (main) deploy is required to test everything; instant Vercel rollback is available if a problem shows.

Note: the analytics injection (`inject-analytics.cjs`, `middleware.js`) is **unchanged** from what's live on production today — same events, same wiring. The only NEW analytics surfaces are the solar CTAs' tagging, the `/audit` page, and the lead-form behavior. So the risk is concentrated in the NEW markup, not the pipeline.

---

## Lane 1 — GA4 (gtag, `G-JE3BZS61FZ`)
Verify in **GA4 → Admin → DebugView** (or Realtime). Add `?_dbg=1`… (GA4 DebugView needs the GA Debugger extension or `debug_mode`).

- [ ] `page_view` — fires automatically on every page load (after the consent gate runs)
- [ ] `app_download_clicked` — click any **Download for Mac** / `/download` CTA. Check props: `cta_location`, `destination_path:"/download"`
- [ ] `get_started_clicked` — click any **Get Infinite / Get started** CTA (→ `/get-started`). Check prop: `cta_location`

## Lane 2 — PostHog (`/ingest` proxy)
Verify in **PostHog → Activity / Live events**.

- [ ] `$pageview` — every page load (autocapture + replay are OFF on `/get-started` and `/audit` by design)
- [ ] `$autocapture` — element clicks on normal pages
- [ ] `get_started_clicked` — click a `/get-started` CTA (same handler as GA4; both fire). Prop: `cta_location`
- [ ] super property `platform: "website"` present on events

## Lane 3 — First-party ledger (infinite-tag runtime → `/infinite/ledger`) — PROD ONLY
Verify in the desktop **Site Analytics → First-party ledger card** (survives ~15-min rollup).

- [ ] `site_page_view` — every page load
- [ ] `site_click` — click any element carrying `data-analytics-cta-id` + `data-analytics-cta-location` (see CTA inventory below)
- [ ] `app_download_click` — click any same-origin `/download` anchor
- [ ] `sign_up_click` — submit the homepage audit form; click **Continue with Google** / email submit on `/get-started` (the only `data-conversion="signup"` elements). Confirm it fires ONCE per action (the form+button double-fire was fixed)

## Lane 4 — Edge middleware (Vercel Log Drain) — PROD ONLY
Verify in the **Vercel Log Drain** ingestion (server-truth lanes).

- [ ] `INFINITE_DOCUMENT_REQUEST_V1` → `site_document_request` — one per document page view (gated to `KNOWN_DOCUMENT_PATHS`; scanners/404s excluded)
- [ ] `INFINITE_DOWNLOAD_ATTEMPT_V1` → `app_download_redirect` — one per `/download` request (the 307 redirect; counts ad-blocked browsers too)

## Lead capture + booking (server writes — testable even on preview via the rewrite)
- [ ] Homepage **audit form** submit → `POST /infinite/leads` (Vercel-rewritten to `api.ultima.inc/api/leads`) → row in `landing_leads` with `source:"leadgen-audit"`. Confirm navigation is gated on `res.ok` (matches live behavior)
- [ ] `/audit` page → **Cal.com** booking widget loads and completes a booking
- [ ] (Deferred, 1bu-1 server work) booked call → Meta CAPI `Schedule` — NOT wired yet; don't expect it

## Meta / X pixels — currently DARK
- [ ] Confirm NO `fbq`/`connect.facebook.net`/`twq` requests fire (pixels unconfigured; nothing should hit Meta/X)

---

## CTA inventory — what to click to exercise `site_click` / `_clicked` events

**Homepage (`/`):**
- `get-started` @ `hero`, `final-cta`, `navigation` (Get Infinite / Get started)
- `download-mac` / `/download` @ `final-cta`, `site-footer`
- `audit-request` @ `hero`, `pricing` (Get free audit / Start with a free audit)
- `audit-submit` @ `audit` (the homepage audit form)
- `feature-{ai-marketing-agents,seo-aeo,x-instagram-content,ads,email,websites-ab-testing}` @ `homepage-capabilities`
- `infinite-os-github` + `agents` @ `homepage-install`

**Every page (shared header + footer):**
- `get-started` @ `navigation` (header "Get Infinite")
- footer column links @ `site-footer` (agents, compare, tools, features, download-mac, github, hub, privacy, terms, launch-videos, …)

**Feature pages:** `feature-*-primary`, `see-shipped-workflows`, `ab-test-ideas-tool`, `/download` @ `feature-*-primary`
**Agents page:** `/download` @ `agents-hero`; `infinite-os-github`/`infinite-skills-github`/`press-agent-github` @ `agents-directory`
**Get-started:** `get-started-google`, `get-started-email`, `get-started-code`, `get-started-resend`, `get-started-change-email`, `get-started-open`, `/download` @ `get-started` / `get-started-fallback`

## Walkthrough order (one clean pass)
1. Load `/` → expect page_view (GA4), $pageview (PostHog), site_page_view + document_request (prod)
2. Click hero **Get Infinite** → get_started_clicked (GA4+PostHog) + site_click
3. Back → click **Get free audit** (hero) → submit audit form → lead row + sign_up_click + audit-submit site_click
4. Footer **Download for Mac** → app_download_clicked (GA4) + app_download_click (ledger) + download_attempt/redirect (edge)
5. Visit `/features/`, `/agents/`, `/tools/`, `/compare/`, `/get-started/`, `/audit/`, `/privacy/` → page_view/$pageview/site_page_view/document_request on each
6. On `/audit/` → confirm Cal.com widget loads
7. On `/get-started/` → Continue with Google / email submit → sign_up_click; confirm autocapture/replay OFF
