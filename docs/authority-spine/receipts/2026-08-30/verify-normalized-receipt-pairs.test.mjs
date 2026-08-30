import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const receiptDir = new URL('.', import.meta.url);
const checker = new URL('./verify-normalized-receipt-pairs.mjs', import.meta.url);

function run(dir) {
  return spawnSync(process.execPath, [checker.pathname, '--receipts-dir', dir], {
    encoding: 'utf8'
  });
}

const passing = run(receiptDir.pathname);
assert.equal(passing.status, 0, passing.stderr || passing.stdout);

const scratch = await mkdtemp(join(tmpdir(), 'authority-spine-receipt-pair-'));
try {
  await cp(receiptDir, scratch, { recursive: true });
  const receiptPath = join(scratch, 'gsc-pages.json');
  const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
  receipt.supplemental_full_row_dump.rows[0].clicks = 999;
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

  const failing = run(scratch);
  assert.notEqual(failing.status, 0, failing.stdout);
  assert.match(failing.stderr, /gsc-pages: MCP summary total_clicks expected 1, observed 1000/);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
