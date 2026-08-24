# Max + Ultra Pricing Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, reviewable page containing three interactive pricing directions for Infinite Max and Infinite Ultra without changing the production homepage.

**Architecture:** Add one self-contained static artifact under `_agent_artifacts/max-ultra-pricing-directions/` so it can reuse the repository's existing no-framework preview pattern. Add one Node verifier that treats the visible copy, direction structure, billing states, reaction controls, and accessibility hooks as a stable contract. The artifact uses local CSS and JavaScript only; no checkout, download, analytics, persistence, or production routing is added.

**Tech Stack:** Semantic HTML, CSS custom properties and container/media queries, vanilla JavaScript, Node.js built-in `assert`, local static HTTP preview.

## Global Constraints

- Infinite Max costs $60 per month or $600 per year ($50 per month equivalent).
- Infinite Ultra costs $200 per month or $2,160 per year ($180 per month equivalent).
- Both plans include a 7-day free trial and can be cancelled at any time.
- Infinite Ultra receives stronger visual emphasis.
- Ultra includes everything in Max, plus AI Visibility, Reels, and Competitor Tracking across content, pricing, and ads.
- Monthly is active by default; Annual must show the monthly equivalent and exact yearly charge.
- Calls to action are inert visual controls in this design-review artifact.
- Do not edit the production homepage source or its pricing CSS.
- Preserve unrelated working-tree changes.

---

### Task 1: Lock the prototype contract and build the review page

**Files:**
- Create: `scripts/verify-max-ultra-pricing-directions.mjs`
- Create: `_agent_artifacts/max-ultra-pricing-directions/index.html`

**Interfaces:**
- Consumes: the approved copy and interaction rules in `docs/superpowers/specs/2026-08-24-max-ultra-pricing-design.md`.
- Produces: one standalone page with `data-direction="twin"`, `data-direction="switcher"`, and `data-direction="power-up"`; billing controls identified by `[data-billing]`; direction selectors identified by `[data-pick-direction]`; reaction inputs identified by `[data-steal]` and `[data-reject]`; and a generated brief in `#combined-brief`.

- [ ] **Step 1: Write the failing source-contract verifier**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pageUrl = new URL("../_agent_artifacts/max-ultra-pricing-directions/index.html", import.meta.url);
const html = readFileSync(fileURLToPath(pageUrl), "utf8");

for (const direction of ["twin", "switcher", "power-up"]) {
  assert.match(html, new RegExp(`data-direction=["']${direction}["']`));
}

for (const copy of [
  "Infinite Max",
  "Infinite Ultra",
  "$60",
  "$200",
  "$50",
  "$180",
  "$600/year",
  "$2,160/year",
  "7-day free trial",
  "AI Visibility",
  "Reels",
  "Competitor Tracking",
  "content, pricing, and ads",
]) {
  assert.ok(html.includes(copy), `Missing required copy: ${copy}`);
}

assert.equal((html.match(/data-billing="monthly"/g) ?? []).length, 3);
assert.equal((html.match(/data-billing="annual"/g) ?? []).length, 3);
assert.equal((html.match(/<button data-pick-direction=/g) ?? []).length, 3);
assert.equal((html.match(/<textarea data-steal/g) ?? []).length, 3);
assert.equal((html.match(/<textarea data-reject/g) ?? []).length, 3);
assert.match(html, /id="combined-brief"/);
assert.match(html, /aria-pressed/);
assert.match(html, /addEventListener\("click"/);
assert.doesNotMatch(html, /save \d+%|billed annually at \$|annual discount/i);

console.log("Max + Ultra pricing directions contract: PASS");
```

- [ ] **Step 2: Run the verifier and confirm it fails because the artifact does not exist**

Run: `node scripts/verify-max-ultra-pricing-directions.mjs`

Expected: `ENOENT` for `_agent_artifacts/max-ultra-pricing-directions/index.html`.

- [ ] **Step 3: Create the semantic page structure**

Use a single `index.html` with this exact top-level structure:

```html
<main>
  <header class="review-hero">
    <p class="eyebrow">Infinite pricing · design review</p>
    <h1>Choose how Max and Ultra should meet.</h1>
    <p>Three different ways to make the upgrade feel obvious.</p>
  </header>

  <section class="direction direction--twin" data-direction="twin">
    <header class="direction__intro">Twin plan cards</header>
    <div class="billing-toggle" role="group" aria-label="Twin cards billing period">
      <button data-billing="monthly" aria-pressed="true">Monthly</button>
      <button data-billing="annual" aria-pressed="false">Annual <small>Lower monthly rate</small></button>
    </div>
    <div class="twin-grid">
      <article class="plan plan--max">
        <p>Infinite Max</p><h2 data-price="max">$60</h2><span>/month</span>
        <p>7-day free trial. Cancel anytime.</p><button type="button">Start free with Max</button>
        <ul><li>Buyer-intent monitoring</li><li>SEO + GEO briefs</li><li>Claude Code + Codex context</li><li>Landing-page A/B test ideas</li><li>Organic content angles</li><li>Growth-stack integrations</li></ul>
      </article>
      <article class="plan plan--ultra">
        <strong>Most powerful</strong><p>Infinite Ultra</p><h2 data-price="ultra">$200</h2><span>/month</span>
        <p>7-day free trial. Cancel anytime.</p><button type="button">Start free with Ultra</button>
        <p>Everything in Max, plus:</p><ul><li>AI Visibility</li><li>Reels</li><li>Competitor Tracking across content, pricing, and ads</li></ul>
      </article>
    </div>
    <aside class="reaction">
      <button data-pick-direction="Twin plan cards" aria-pressed="false">Choose this direction</button>
      <label>Details to steal<textarea data-steal></textarea></label><label>Details to reject<textarea data-reject></textarea></label>
    </aside>
  </section>

  <section class="direction direction--switcher" data-direction="switcher">
    <header class="direction__intro">Interactive plan switcher</header>
    <div class="billing-toggle" role="group" aria-label="Switcher billing period">
      <button data-billing="monthly" aria-pressed="true">Monthly</button>
      <button data-billing="annual" aria-pressed="false">Annual <small>Lower monthly rate</small></button>
    </div>
    <div class="plan-switch" role="group" aria-label="Plan"><button data-plan="max">Max</button><button data-plan="ultra">Ultra</button></div>
    <article class="focus-plan" data-active-plan="ultra">
      <div><p data-focus-eyebrow>See more. Create more. Track everything.</p><h2 data-focus-name>Infinite Ultra</h2><p data-focus-price data-price="ultra">$200</p><span>/month</span><p>7-day free trial. Cancel anytime.</p><button type="button">Start free</button></div>
      <div><h3>Everything in Max</h3><ul><li>Intent, search, content, experiments, and integrations</li></ul><div data-ultra-extras><h3>Ultra unlocks</h3><ul><li>AI Visibility</li><li>Reels</li><li>Competitor Tracking across content, pricing, and ads</li></ul></div></div>
    </article>
    <aside class="reaction">
      <button data-pick-direction="Interactive plan switcher" aria-pressed="false">Choose this direction</button>
      <label>Details to steal<textarea data-steal></textarea></label><label>Details to reject<textarea data-reject></textarea></label>
    </aside>
  </section>

  <section class="direction direction--power-up" data-direction="power-up">
    <header class="direction__intro">Base + power-up</header>
    <div class="billing-toggle" role="group" aria-label="Base and power-up billing period">
      <button data-billing="monthly" aria-pressed="true">Monthly</button>
      <button data-billing="annual" aria-pressed="false">Annual <small>Lower monthly rate</small></button>
    </div>
    <div class="power-stack">
      <article class="plan plan--max"><p>The complete growth OS</p><h2>Infinite Max</h2><p data-price="max">$60</p><span>/month</span><p>7-day free trial. Cancel anytime.</p><ul><li>Buyer intent</li><li>SEO + GEO</li><li>Shipping context</li><li>Content and experiments</li></ul><button type="button">Start free with Max</button></article>
      <article class="plan plan--ultra"><p>Everything in Max, plus</p><h2>Infinite Ultra</h2><p data-price="ultra">$200</p><span>/month</span><ul><li>AI Visibility</li><li>Reels</li><li>Competitor Tracking across content, pricing, and ads</li></ul><button type="button">Start free with Ultra</button></article>
    </div>
    <aside class="reaction">
      <button data-pick-direction="Base + power-up" aria-pressed="false">Choose this direction</button>
      <label>Details to steal<textarea data-steal></textarea></label><label>Details to reject<textarea data-reject></textarea></label>
    </aside>
  </section>

  <section class="decision-summary">
    <h2>Your combined direction</h2>
    <output id="combined-brief" aria-live="polite">Choose a direction or add notes above.</output>
  </section>
</main>
```

The finished document also includes its doctype, language, viewport metadata, title, font declarations, complete CSS, and the interaction script from Step 5.

- [ ] **Step 4: Apply the Infinite visual system and distinct layouts**

Define and use these exact foundational values, then give each direction a distinct layout rather than recoloring the same card skeleton:

```css
:root {
  --ink: #141414;
  --muted: #626872;
  --paper: #f7f9fc;
  --card: rgba(255, 255, 255, 0.92);
  --line: #dfe5ed;
  --green: #57c879;
  --blue: #cfe5ff;
  --pink: #ffd7e8;
  --radius: 28px;
  --shadow: 0 24px 70px rgba(34, 53, 82, 0.12);
}

body {
  margin: 0;
  color: var(--ink);
  background: radial-gradient(circle at 8% 30%, rgba(255, 215, 232, .45), transparent 28%),
              radial-gradient(circle at 92% 20%, rgba(207, 229, 255, .65), transparent 30%),
              var(--paper);
  font-family: "Hanken Grotesk", Inter, system-ui, sans-serif;
}

.direction--twin .twin-grid { display: grid; grid-template-columns: 1fr 1.08fr; gap: 20px; }
.direction--twin .plan--ultra { color: white; background: #15171b; transform: translateY(-10px); }
.direction--switcher .focus-plan { display: grid; grid-template-columns: minmax(240px, .8fr) 1.4fr; }
.direction--power-up .power-stack { display: grid; grid-template-columns: 1.08fr .92fr; align-items: stretch; }
.direction--power-up .plan--ultra { margin-left: -24px; margin-top: 34px; border-left: 4px solid var(--green); }

@media (max-width: 760px) {
  .direction--twin .twin-grid,
  .direction--switcher .focus-plan,
  .direction--power-up .power-stack { grid-template-columns: 1fr; }
  .direction--twin .plan--ultra { order: -1; }
  .direction--power-up .plan--ultra { margin: -10px 0 0; }
}
```

Use local `../../fonts/infinite-ui/hanken-grotesk-*.woff2` font files through `@font-face`. Keep maximum content width at `1180px`, minimum touch target height at `44px`, body copy at least `16px`, visible `:focus-visible` rings, and no horizontal overflow at `360px`.

- [ ] **Step 5: Add the billing, plan-switcher, and reaction behavior**

```js
const planCopy = {
  max: {
    name: "Infinite Max",
    monthly: { price: "$60", note: "Billed monthly" },
    annual: { price: "$50", note: "Billed $600/year" },
    eyebrow: "The complete growth operating system",
  },
  ultra: {
    name: "Infinite Ultra",
    monthly: { price: "$200", note: "Billed monthly" },
    annual: { price: "$180", note: "Billed $2,160/year" },
    eyebrow: "See more. Create more. Track everything.",
  },
};

document.querySelectorAll("[data-direction]").forEach((direction) => {
  direction.querySelectorAll("[data-billing]").forEach((button) => {
    button.addEventListener("click", () => {
      const annual = button.dataset.billing === "annual";
      direction.querySelectorAll("[data-billing]").forEach((peer) => {
        peer.setAttribute("aria-pressed", String(peer === button));
      });
      direction.querySelectorAll("[data-price]").forEach((price) => {
        price.textContent = planCopy[price.dataset.price][button.dataset.billing].price;
        price.classList.toggle("price--pending", annual);
      });
    });
  });
});

document.querySelectorAll("[data-plan]").forEach((button) => {
  button.addEventListener("click", () => renderFocusPlan(button.dataset.plan));
});

function renderFocusPlan(plan) {
  const panel = document.querySelector(".focus-plan");
  const button = document.querySelector(`[data-plan="${plan}"]`);
  const annual = panel.closest("[data-direction]").querySelector('[data-billing][aria-pressed="true"]').dataset.billing === "annual";
  panel.dataset.activePlan = plan;
  panel.querySelector("[data-focus-name]").textContent = planCopy[plan].name;
  panel.querySelector("[data-focus-price]").dataset.price = plan;
  panel.querySelector("[data-focus-price]").textContent = planCopy[plan][activeBilling.dataset.billing].price;
  panel.querySelector("[data-focus-eyebrow]").textContent = planCopy[plan].eyebrow;
  panel.querySelector("[data-ultra-extras]").hidden = plan !== "ultra";
  document.querySelectorAll("[data-plan]").forEach((peer) => peer.setAttribute("aria-pressed", String(peer === button)));
}

document.querySelectorAll("[data-pick-direction]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-pick-direction]").forEach((peer) => peer.setAttribute("aria-pressed", String(peer === button)));
    updateBrief();
  });
});
document.querySelectorAll("[data-steal], [data-reject]").forEach((field) => field.addEventListener("input", updateBrief));

function updateBrief() {
  const chosen = document.querySelector('[data-pick-direction][aria-pressed="true"]')?.dataset.pickDirection ?? "No direction selected";
  const notes = [...document.querySelectorAll("[data-direction]")].map((direction) => ({
    name: direction.dataset.direction,
    steal: direction.querySelector("[data-steal]").value.trim(),
    reject: direction.querySelector("[data-reject]").value.trim(),
  })).filter((note) => note.steal || note.reject);
  document.querySelector("#combined-brief").textContent = `Preferred direction: ${chosen}. ${notes.map((note) => `${note.name}: steal ${note.steal || "nothing noted"}; reject ${note.reject || "nothing noted"}.`).join(" ")}`;
}
```

Do not use browser storage; the current DOM is the session state.

- [ ] **Step 6: Run the verifier and fix the artifact until it passes**

Run: `node scripts/verify-max-ultra-pricing-directions.mjs`

Expected: `Max + Ultra pricing directions contract: PASS`.

- [ ] **Step 7: Commit the isolated prototype**

```bash
git add scripts/verify-max-ultra-pricing-directions.mjs _agent_artifacts/max-ultra-pricing-directions/index.html
git commit -m "feat: add Max and Ultra pricing design directions"
```

### Task 2: Validate and present the visual review

**Files:**
- Verify: `_agent_artifacts/max-ultra-pricing-directions/index.html`
- Verify: `scripts/verify-max-ultra-pricing-directions.mjs`

**Interfaces:**
- Consumes: the completed static artifact from Task 1.
- Produces: a working local review URL opened in one stable in-app browser tab.

- [ ] **Step 1: Run the source contract from a clean command**

Run: `node scripts/verify-max-ultra-pricing-directions.mjs`

Expected: `Max + Ultra pricing directions contract: PASS`.

- [ ] **Step 2: Start a retained local preview server**

Run from the repository root: `python3 -m http.server 4173`

Expected: the process remains active and serves the repository at `http://127.0.0.1:4173/`.

- [ ] **Step 3: Force the exact route to render without opening a browser**

Run: `curl --fail --silent --output /dev/null http://127.0.0.1:4173/_agent_artifacts/max-ultra-pricing-directions/`

Expected: exit code `0`.

- [ ] **Step 4: Open the exact review route in the in-app browser**

Open: `http://127.0.0.1:4173/_agent_artifacts/max-ultra-pricing-directions/`

Expected: one continuous tab displaying the pricing review hero followed by Twin Cards, Interactive Switcher, Base + Power-up, and the combined-direction summary.

- [ ] **Step 5: Hand off the review interaction**

Tell the user to choose a direction, add any steal/reject notes, and paste back the generated combined brief. Keep the production homepage unchanged until that review is complete.
