import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
const html = readFileSync(new URL("../get-started/index.html", import.meta.url), "utf8");
test("the gate verifies identity without persisting or redeeming a login ticket", () => {
  assert.ok(html.includes('/infinite/auth/site/verify'));
  assert.ok(html.includes('data.verificationId'));
  assert.ok(!html.includes('infinite://handoff'));
  assert.ok(!html.includes('id="gate-open-infinite"'));
  assert.ok(!html.includes('data.secret'));
  assert.ok(html.includes('sign in with the same account'));
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (match[1].trim()) new Script(match[1]);
  }
});
test("the verification endpoint is proxied to the cloud", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.ok(config.rewrites.some(r => r.source === '/infinite/auth/site/verify' && r.destination.endsWith('/api/auth/site/verify')));
});
