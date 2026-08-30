import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const receiptDir = new URL('.', import.meta.url);
const checker = new URL('./verify-normalized-receipt-pairs.mjs', import.meta.url);

function run(dir, ...args) {
  return spawnSync(process.execPath, [checker.pathname, '--receipts-dir', dir, ...args], {
    encoding: 'utf8'
  });
}

async function withMutatedGscPage(field, value, args, verify) {
  const scratch = await mkdtemp(join(tmpdir(), 'authority-spine-receipt-pair-'));
  try {
    await cp(receiptDir, scratch, { recursive: true });
    const receiptPath = join(scratch, 'gsc-pages.json');
    const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
    receipt.supplemental_full_row_dump.rows[0][field] = value;
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

    const beforeWrite = await readFile(join(scratch, 'mcp-proof-consistency-check.json'), 'utf8');
    const failing = run(scratch, ...args);
    assert.notEqual(failing.status, 0, failing.stdout);
    await verify(failing, scratch, beforeWrite);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

const passing = run(receiptDir.pathname);
assert.equal(passing.status, 0, passing.stderr || passing.stdout);

await withMutatedGscPage('clicks', 999, [], async (failing) => {
  assert.match(failing.stderr, /gsc-pages: MCP summary total_clicks expected 1, observed 1000/);
});

for (const [field, value] of [['position', 999], ['ctr', 999]]) {
  await withMutatedGscPage(field, value, [], async (failing) => {
    assert.match(failing.stderr, /gsc-pages: MCP\/CLI Postgres-compatible rowset MD5 differs/);
    assert.match(failing.stderr, /gsc-pages: retained canonical CLI SHA-256 differs/);
  });
}

await withMutatedGscPage('position', 999, ['--write'], async (failing, scratch, beforeWrite) => {
  assert.match(failing.stderr, /gsc-pages: MCP\/CLI Postgres-compatible rowset MD5 differs/);
  assert.equal(await readFile(join(scratch, 'mcp-proof-consistency-check.json'), 'utf8'), beforeWrite);
});
