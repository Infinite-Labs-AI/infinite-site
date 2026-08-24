import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pageUrl = new URL(
  "../_agent_artifacts/max-ultra-pricing-directions/index.html",
  import.meta.url,
);
const html = readFileSync(fileURLToPath(pageUrl), "utf8");

for (const direction of ["twin", "switcher", "power-up"]) {
  assert.match(
    html,
    new RegExp(`data-direction=["']${direction}["']`),
    `Missing ${direction} direction`,
  );
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
assert.equal((html.match(/<button[^>]+data-pick-direction=/g) ?? []).length, 3);
assert.equal((html.match(/<textarea[^>]+data-steal/g) ?? []).length, 3);
assert.equal((html.match(/<textarea[^>]+data-reject/g) ?? []).length, 3);
assert.match(html, /id="combined-brief"/);
assert.match(html, /aria-pressed/);
assert.match(html, /addEventListener\("click"/);
assert.match(html, /@media\s*\(max-width:\s*760px\)/);
assert.match(html, /:focus-visible/);
assert.match(html, /class="compact-shared"/);
assert.match(html, /direction--twin \.stage\s*\{[^}]*max-width:\s*980px/s);
assert.match(html, /direction--twin \.price\s*\{[^}]*font-size:\s*clamp\(46px,\s*5vw,\s*60px\)/s);
assert.match(html, /data-pick-direction="Twin plan cards" aria-pressed="true"/);
assert.doesNotMatch(html, /save \d+%|billed annually at \$|annual discount/i);
assert.doesNotMatch(html, /\$49|\$199|Pricing coming soon|annual prices remain unset/i);
assert.doesNotMatch(html, /href=["']\/download/);

const planCopyMatch = html.match(/const planCopy = (\{[\s\S]*?\n    \});/);
assert.ok(planCopyMatch, "Missing executable plan price catalog");
const planCopy = Function(`"use strict"; return (${planCopyMatch[1]});`)();
assert.deepEqual(planCopy.max.monthly, {
  price: "$60",
  period: "/month",
  note: "Billed monthly",
});
assert.deepEqual(planCopy.max.annual, {
  price: "$50",
  period: "/month",
  note: "Billed $600/year",
});
assert.deepEqual(planCopy.ultra.monthly, {
  price: "$200",
  period: "/month",
  note: "Billed monthly",
});
assert.deepEqual(planCopy.ultra.annual, {
  price: "$180",
  period: "/month",
  note: "Billed $2,160/year",
});
assert.match(html, /planCopy\[price\.dataset\.price\]\[billing\]\.price/);
assert.match(html, /planCopy\[note\.dataset\.billingNote\]\[billing\]\.note/);

console.log("Max + Ultra pricing directions contract: PASS");
