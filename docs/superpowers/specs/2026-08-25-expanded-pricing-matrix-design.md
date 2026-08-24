# Expanded Max + Ultra Pricing Matrix Design

## Goal

Make Infinite's pricing section communicate the real breadth of the product without returning to oversized pricing cards. Keep the approved compact Max and Ultra decision cards, then place an always-visible, evidence-backed feature comparison directly below them.

## Product sources

The capability inventory is grounded in the closed `1bu-1` product repo, read-only:

- `apps/desktop/src/shared/nav.ts`: 21 visible desktop surfaces.
- `docs/ai/agent-tools.md`: 79 agent tools across 14 groups.
- `docs/seo/seo-system.md`: active keyword, strategy, execution, publishing, rank, and AEO systems.
- `docs/ads/ads-system.md`: active creative generation, ad autopilot, approval, launch, and performance systems.
- `docs/competitors/competitors.md`: competitor profiles and historical/read intelligence; old third-party acquisition is retired.
- Desktop renderer surfaces under `apps/desktop/src/renderer/`: lead scanners, analytics, ads, SEO, organic content, X content, YouTube, Reels, links, brand context, connections, and agent tasks.

No files in `1bu-1` are modified by this website work.

## Plan contract

### Infinite Max

- $60 per month.
- $600 per year, displayed as $50 per month billed annually.
- 7-day free trial.
- Includes the complete core growth operator described below, except the five Ultra-exclusive capabilities.

### Infinite Ultra

- $200 per month.
- $2,160 per year, displayed as $180 per month billed annually.
- 7-day free trial.
- Includes everything in Max.
- Adds exactly five highlighted capabilities:
  - AI Visibility
  - Reels
  - Competitor Tracking across content, pricing, and ads
  - Landing-page A/B Testing
  - Faceless YouTube Video Generation

## Reference semantics

The Ploy pricing reference succeeds because it keeps the feature inventory visible, makes tier differences scannable, and repeats plan context during a long scroll.

Preserve:

- Always-visible feature density.
- Clear inclusion states.
- Strong recommended-tier emphasis.
- Plan context that remains legible while scanning.
- A conversion action after the complete value stack.

Adapt:

- Four tall pricing cards become two compact decision cards plus one comparison matrix.
- Ploy's credit selector becomes Infinite's existing Monthly / Annual toggle.
- Disabled feature lists become a Max inclusion cell and an Ultra inclusion cell for every row.
- Ultra-exclusive rows receive an explicit Ultra badge and a subtle tinted row treatment.

Drop:

- Free and Enterprise tiers.
- Credit-volume controls.
- Large empty areas inside equal-height cards.
- Repeating the full shared inventory inside both pricing cards.
- Accordions or collapsed categories.

## Page structure

1. Preserve the existing pricing heading and Monthly / Annual toggle.
2. Preserve the compact Max and Ultra cards as the plan-decision header.
3. Add a proof strip below the cards:
   - `79 agent tools`
   - `One growth operating system`
4. Add the always-visible comparison headed `Everything Infinite does.`
5. Render eight feature groups containing the 21 bundled rows below.
6. Add a closing CTA strip with both plan names and the existing Download for Mac action.
7. Keep the trial and cancellation reassurance below the final CTA.

## Plan-card positioning

The compact cards explain who each plan is for. The comparison matrix owns the capability detail, so the cards no longer repeat outcome or feature lists.

### Max — Best for

- Solo founders from $0 to $10k MRR
- Small bootstrapped teams
- Content creators building distribution

### Ultra — Best for

- Fast-growing, venture-backed teams
- Companies above $10k MRR
- Teams scaling multiple channels and content output

## Capability matrix

Every Max capability is also included in Ultra. `Ultra only` means the Max cell shows a neutral dash with accessible text `Not included in Max`, while the Ultra cell shows a highlighted `Ultra` badge.

### 1. Find buyers

| Capability | Max | Ultra |
|---|---:|---:|
| Lead scanners: Reddit, X, and Facebook Groups | Included | Included |
| Buyer-intent qualification, source context, and next actions | Included | Included |

### 2. SEO, GEO, and AI search

| Capability | Max | Ultra |
|---|---:|---:|
| Keyword research and curation | Included | Included |
| SEO and GEO strategy and briefs | Included | Included |
| Calendar, custom-domain publishing, and rank monitoring | Included | Included |
| AI Visibility and citation monitoring | Ultra only | Included |

### 3. Meta Ads and creative

| Capability | Max | Ultra |
|---|---:|---:|
| Ad creative generation and research | Included | Included |
| Ad autopilot with strategy, approvals, launch, and creative operations | Included | Included |

### 4. Organic content and video

| Capability | Max | Ultra |
|---|---:|---:|
| Instagram and X content intelligence | Included | Included |
| Viral trend discovery | Included | Included |
| Faceless YouTube video generation | Ultra only | Included |
| Reels creation | Ultra only | Included |

### 5. Conversion and sites

| Capability | Max | Ultra |
|---|---:|---:|
| Site funnels, pages, and CTA breakdowns | Included | Included |
| Tracked links, UTMs, and landing-page creation | Included | Included |
| Landing-page A/B testing | Ultra only | Included |

### 6. Analytics and revenue

| Capability | Max | Ultra |
|---|---:|---:|
| Site Analytics for traffic, channels, audience, pages, and funnels | Included | Included |
| App Analytics | Included | Included |
| Revenue, MRR, churn, orders, ROAS, spend, and CTR | Included | Included |

### 7. Connections

| Capability | Max | Ultra |
|---|---:|---:|
| Analytics and search connections: GA4, PostHog, and Google Search Console | Included | Included |
| Growth stack connections: Meta, Instagram, X, Stripe, Shopify, Codex, and Gemini | Included | Included |

### 8. Competitive intelligence

| Capability | Max | Ultra |
|---|---:|---:|
| Competitor Tracking across content, pricing, and ads | Ultra only | Included |

## Visual design

- Keep the comparison inside the same 980-pixel maximum width as the compact pricing package.
- Use a three-column desktop grid: feature name, Max, Ultra.
- Give the Ultra column a subtle blue/pink tint and a dark Ultra header, not a full-height black slab.
- Group headings use the existing mono eyebrow treatment and remain visually distinct from feature rows.
- Shared rows use green check icons for both plans.
- Ultra-only rows use a neutral dash for Max and a small high-contrast Ultra badge for Ultra.
- Use hairline borders and alternating near-white row surfaces to support a long scan.
- Keep body text between 13 and 15 pixels and touch targets at least 44 pixels.

## Sticky context

On desktop, the matrix column header becomes sticky only while the comparison matrix is in view. It contains `Feature`, `Max`, and `Ultra`; it does not duplicate prices or CTAs. The existing site header remains above it, and the matrix header offset must prevent overlap.

On mobile, sticky behavior is removed. Every category remains expanded. Each feature row shows its name first and two compact labelled cells beneath it, so no horizontal scrolling is required.

## Interaction behavior

- Monthly / Annual continues to update only the plan prices and billing notes.
- The comparison inventory does not change by billing period.
- Calls to action remain `/download` links with placement analytics markers.
- No checkout or Stripe price IDs are added to the marketing site; the desktop paywall owns checkout.
- Keyboard focus remains visible on billing controls and CTAs.

## Copy guardrails

- Do not describe competitor acquisition as continuous, live, automatic, or newly fetched unless the current Ultra implementation proves that behavior. The canonical competitor doc states that the prior third-party acquisition path is retired.
- Do not claim automatic Reels or YouTube publishing. The rows promise creation/generation only.
- Do not expose internal architecture, model names, provider costs, or tool IDs in marketing copy.
- Do not market hidden email or standalone UGC surfaces merely because agent tools exist; they are excluded from this matrix.
- Preserve the exact current monthly, annual, and trial amounts.

## Testing contract

- The homepage verifier asserts all eight group identifiers and exactly 21 feature rows.
- The verifier asserts exactly five Ultra-only rows and pins their labels.
- The verifier rejects the five Ultra capabilities if they appear as included in Max.
- The verifier asserts the proof-strip count `79` and the `One growth operating system` statement.
- The verifier asserts the matrix remains present in built `dist/index.html`.
- The verifier asserts the mobile layout has no horizontal overflow contract and no collapsed/accordion markup.
- The verifier asserts the exact three Max and three Ultra `Best for` statements.
- Existing pricing amount, billing-toggle, download-marker, build, analytics-injection, and stale-price checks continue to pass.

## Success criteria

- A buyer can see that Infinite covers leads, search, ads, content, conversion, analytics, and execution without opening another section.
- The compact plan cards remain no larger than the approved current version.
- Ultra visibly contains more value through five exclusive capabilities without making Max look incomplete.
- The complete inventory is visible by default on desktop and mobile.
- Every claim is either code-backed in `1bu-1` or explicitly founder-declared in this design.
