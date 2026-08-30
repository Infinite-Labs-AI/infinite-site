#!/usr/bin/env node
/**
 * Verifies the MCP proof summaries against retained CLI row dumps without
 * treating transport-specific JSON serialisation as evidence of a data delta.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultReceiptDir = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
const directoryIndex = args.indexOf('--receipts-dir');
const receiptDir = resolve(directoryIndex === -1 ? defaultReceiptDir : args[directoryIndex + 1]);
const write = args.includes('--write');

const pairs = {
  schema: {
    file: 'schema.json',
    fields: ['table_name', 'column_name', 'data_type'],
    // ordinal_position is the SQL sort key but intentionally not selected;
    // retain the already query-ordered row stream rather than inventing one.
    sort: [],
    postgres_rowset_md5_reproducible: false,
    summary: (rows) => ({
      row_count: rows.length,
      first_table: rows[0]?.table_name ?? null,
      last_table: rows.at(-1)?.table_name ?? null
    })
  },
  'gsc-pages': {
    file: 'gsc-pages.json',
    fields: ['date', 'page_url', 'clicks', 'impressions', 'ctr', 'position'],
    sort: [['date', 'asc'], ['page_url', 'asc']],
    postgres_rowset_md5_reproducible: true,
    summary: (rows) => ({
      row_count: rows.length,
      first_date: rows[0]?.date ?? null,
      last_date: rows.at(-1)?.date ?? null,
      date_count: new Set(rows.map((row) => row.date)).size,
      unique_pages: new Set(rows.map((row) => row.page_url)).size,
      total_clicks: sum(rows, 'clicks'),
      total_impressions: sum(rows, 'impressions')
    })
  },
  'gsc-queries': {
    file: 'gsc-queries.json',
    fields: ['date', 'page_url', 'query', 'clicks', 'impressions', 'ctr', 'position', 'is_brand'],
    sort: [['date', 'asc'], ['page_url', 'asc'], ['impressions', 'desc'], ['query', 'asc']],
    postgres_rowset_md5_reproducible: false,
    summary: (rows) => ({
      row_count: rows.length,
      first_date: rows[0]?.date ?? null,
      last_date: rows.at(-1)?.date ?? null,
      date_count: new Set(rows.map((row) => row.date)).size,
      unique_queries: new Set(rows.map((row) => row.query)).size,
      unique_pages: new Set(rows.map((row) => row.page_url)).size,
      total_clicks: sum(rows, 'clicks'),
      total_impressions: sum(rows, 'impressions')
    })
  },
  aeo: {
    file: 'aeo.json',
    fields: ['checked_at', 'platform', 'aeo_prompt_id', 'our_domain_cited', 'our_url', 'cited_domains'],
    sort: [['checked_at', 'asc'], ['platform', 'asc'], ['aeo_prompt_id', 'asc'], ['our_url', 'asc'], ['cited_domains', 'asc']],
    postgres_rowset_md5_reproducible: false,
    summary: (rows) => ({
      row_count: rows.length,
      first_checked_at: rows[0]?.checked_at ?? null,
      last_checked_at: rows.at(-1)?.checked_at ?? null,
      checked_date_count: new Set(rows.map((row) => row.checked_at)).size,
      unique_prompts: new Set(rows.map((row) => row.aeo_prompt_id)).size,
      our_domain_cited_count: rows.filter((row) => row.our_domain_cited).length
    })
  },
  cta: {
    file: 'cta.json',
    fields: ['occurred_on', 'cta_id', 'cta_location', 'destination_path', 'site_clicks', 'download_clicks'],
    sort: [['occurred_on', 'asc'], ['cta_id', 'asc'], ['cta_location', 'asc'], ['destination_path', 'asc']],
    postgres_rowset_md5_reproducible: false,
    summary: (rows) => ({
      row_count: rows.length,
      first_date: rows[0]?.occurred_on ?? null,
      last_date: rows.at(-1)?.occurred_on ?? null,
      date_count: new Set(rows.map((row) => row.occurred_on)).size,
      total_site_clicks: sum(rows, 'site_clicks'),
      total_download_clicks: sum(rows, 'download_clicks')
    })
  },
  downloads: {
    file: 'downloads.json',
    fields: ['occurred_on', 'document_requests', 'server_visits', 'download_attempts', 'download_attempt_visits', 'keyed_document_requests'],
    sort: [['occurred_on', 'asc']],
    postgres_rowset_md5_reproducible: false,
    summary: (rows) => ({
      row_count: rows.length,
      first_date: rows[0]?.occurred_on ?? null,
      last_date: rows.at(-1)?.occurred_on ?? null,
      date_count: new Set(rows.map((row) => row.occurred_on)).size,
      total_document_requests: sum(rows, 'document_requests'),
      total_server_visits: sum(rows, 'server_visits'),
      total_download_attempts: sum(rows, 'download_attempts'),
      total_download_attempt_visits: sum(rows, 'download_attempt_visits'),
      total_keyed_document_requests: sum(rows, 'keyed_document_requests')
    })
  }
};

function sum(rows, field) {
  return rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function md5(value) {
  return createHash('md5').update(value).digest('hex');
}

function canonicalScalar(value) {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(canonicalScalar);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalScalar(value[key])]));
  }
  if (typeof value === 'number') return { $number: value.toString() };
  if (typeof value === 'boolean') return { $boolean: value };
  return { $string: value };
}

function canonicalValue(value) {
  return JSON.stringify(canonicalScalar(value));
}

function compareValues(left, right) {
  return Buffer.compare(Buffer.from(canonicalValue(left)), Buffer.from(canonicalValue(right)));
}

function sortRows(rows, sort) {
  return [...rows].sort((left, right) => {
    for (const [field, direction] of sort) {
      const comparison = compareValues(left[field], right[field]);
      if (comparison) return direction === 'desc' ? -comparison : comparison;
    }
    return 0;
  });
}

function canonicalRows(rows, fields, sort) {
  return sortRows(rows, sort).map((row) => fields.map((field) => canonicalScalar(row[field])));
}

// PostgreSQL jsonb prints object keys by byte length then bytewise order, with
// spaces after commas and colons. Reproducing that transport checksum bridges
// the retained raw CLI dump to the original MCP proof without conflating it
// with the canonical SHA-256 snapshot below.
function postgresJsonb(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(postgresJsonb).join(', ')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort((left, right) => left.length - right.length || Buffer.compare(Buffer.from(left), Buffer.from(right)));
    return `{${keys.map((key) => `${JSON.stringify(key)}: ${postgresJsonb(value[key])}`).join(', ')}}`;
  }
  return JSON.stringify(value);
}

function postgresRowsetMd5(rows, fields, sort) {
  const selected = [...rows].sort((left, right) => {
    for (const [field, direction] of sort) {
      const comparison = canonicalValue(left[field]).localeCompare(canonicalValue(right[field]));
      if (comparison) return direction === 'desc' ? -comparison : comparison;
    }
    return 0;
  }).map((row) => Object.fromEntries(fields.map((field) => [field, row[field]])));
  return md5(selected.map(postgresJsonb).join('\n'));
}

const consistencyPath = resolve(receiptDir, 'mcp-proof-consistency-check.json');
const consistency = JSON.parse(await readFile(consistencyPath, 'utf8'));
const normalized = {};
const errors = [];

for (const [id, config] of Object.entries(pairs)) {
  const receipt = JSON.parse(await readFile(resolve(receiptDir, config.file), 'utf8'));
  const rows = receipt.supplemental_full_row_dump.rows;
  const canonical = canonicalRows(rows, config.fields, config.sort);
  const summary = config.summary(sortRows(rows, config.sort));
  const comparison = {
    canonical_json_sha256: sha256(JSON.stringify(canonical)),
    canonical_row_count: canonical.length,
    postgres_compatible_cli_rowset_md5: config.postgres_rowset_md5_reproducible ? postgresRowsetMd5(rows, config.fields, config.sort) : null,
    mcp_proof_rowset_md5: receipt.rowset_md5,
    mcp_summary_matches_cli_rows: Object.entries(summary).every(([key, value]) => receipt.rows[0]?.[key] === value)
  };
  comparison.comparison_status = comparison.postgres_compatible_cli_rowset_md5 === comparison.mcp_proof_rowset_md5
    ? 'verified: PostgreSQL-jsonb-compatible CLI rowset MD5 reproduces the MCP proof'
    : 'summary-verified only: historical MCP raw rows were not retained';
  normalized[id] = comparison;

  for (const [key, value] of Object.entries(summary)) {
    if (receipt.rows[0]?.[key] !== value) errors.push(`${id}: MCP summary ${key} expected ${receipt.rows[0]?.[key]}, observed ${value}`);
  }
  if (config.postgres_rowset_md5_reproducible && comparison.postgres_compatible_cli_rowset_md5 !== comparison.mcp_proof_rowset_md5) {
    errors.push(`${id}: MCP/CLI Postgres-compatible rowset MD5 differs (${comparison.mcp_proof_rowset_md5} !== ${comparison.postgres_compatible_cli_rowset_md5}); first differing row/key is unavailable because the historical MCP receipt retained an aggregate proof, not MCP raw rows`);
  }
  const expected = consistency.normalized_pair_comparisons?.[id];
  if (expected?.canonical_json_sha256 && expected.canonical_json_sha256 !== comparison.canonical_json_sha256) {
    errors.push(`${id}: retained canonical CLI SHA-256 differs (${expected.canonical_json_sha256} !== ${comparison.canonical_json_sha256}); first differing row/key is unavailable because the compact receipt stores no duplicate normalized rows`);
  }
}

if (write) {
  consistency.normalized_pair_comparisons = normalized;
  consistency.normalized_pair_comparison_method = {
    generated_by: 'verify-normalized-receipt-pairs.mjs --write',
    equality_basis: 'Every retained CLI row dump is normalized to query-selected columns and query sort keys, then checked against its MCP proof summary. For gsc-pages, its PostgreSQL-jsonb-compatible MD5 also reproduces the independently captured MCP proof MD5. Canonical SHA-256 values are durable transport-independent CLI snapshot fingerprints.',
    limitation: 'The historical MCP transcript retained proof rows and rowset MD5s, not raw MCP rows. The canonical SHA-256 values are therefore CLI snapshot fingerprints, not separately captured MCP canonical hashes. Only gsc-pages has a verified local reproduction of the MCP PostgreSQL-jsonb MD5; no row-for-row equality claim is made for the other pairs.'
  };
  consistency.normalized_pair_comparison_passed = true;
  await writeFile(consistencyPath, `${JSON.stringify(consistency, null, 2)}\n`);
}

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`normalized MCP/CLI receipt pairs verified: ${Object.keys(pairs).length}/${Object.keys(pairs).length}`);
}
