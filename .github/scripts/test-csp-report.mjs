import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Readable } from "node:stream";

const source = readFileSync(new URL("../../api/csp-report.js", import.meta.url), "utf8");
assert.match(source, /export default async function cspReport/);
assert.doesNotMatch(source, /module\.exports|require\s*\(/);
const { default: handler } = await import("../../api/csp-report.js");
const originalWarn = console.warn;
const warnings = [];
console.warn = (...values) => warnings.push(values);

const invoke = async (method, body, contentType = "application/csp-report") => {
  const response = { headers: {}, statusCode: 200 };
  response.setHeader = (key, value) => { response.headers[key] = value; };
  response.status = (statusCode) => { response.statusCode = statusCode; return response; };
  response.end = () => response;
  await handler({ method, body, headers: { "content-type": contentType } }, response);
  return response;
};

try {
  const legacy = await invoke("POST", {
    "csp-report": {
      "document-uri": "https://infinite.fast/tools/?secret=redacted",
      "violated-directive": "script-src-elem",
      "effective-directive": "script-src-elem",
      "blocked-uri": "https://unexpected.example/script.js?token=redacted",
      disposition: "enforce",
      "script-sample": "must not be logged",
      "original-policy": "must not be logged",
    },
  }, "application/csp-report; charset=utf-8");
  assert.equal(legacy.statusCode, 204);
  assert.equal(legacy.headers["Cache-Control"], "no-store");
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][0], "csp_violation");
  assert.deepEqual(JSON.parse(warnings[0][1]), {
    document: "https://infinite.fast/tools/",
    directive: "script-src-elem",
    violatedDirective: "script-src-elem",
    blocked: "https://unexpected.example/script.js",
    disposition: "enforce",
  });

  warnings.length = 0;
  const rawLegacy = await invoke("POST", Buffer.from(JSON.stringify({
    "csp-report": {
      "document-uri": "https://infinite.fast/guardrail?secret=redacted",
      "violated-directive": "script-src",
      "blocked-uri": "inline",
    },
  })));
  assert.equal(rawLegacy.statusCode, 204);
  assert.deepEqual(JSON.parse(warnings[0][1]), {
    document: "https://infinite.fast/guardrail",
    violatedDirective: "script-src",
    blocked: "inline",
  });

  warnings.length = 0;
  const streamedLegacyRequest = Readable.from([Buffer.from(JSON.stringify({
    "csp-report": {
      "document-uri": "https://infinite.fast/streamed?secret=redacted",
      "violated-directive": "connect-src",
      "blocked-uri": "https://unexpected.example/collect?private=1",
    },
  }))]);
  streamedLegacyRequest.method = "POST";
  streamedLegacyRequest.headers = { "content-type": "application/csp-report" };
  const streamedLegacy = { headers: {}, statusCode: 200 };
  streamedLegacy.setHeader = (key, value) => { streamedLegacy.headers[key] = value; };
  streamedLegacy.status = (statusCode) => { streamedLegacy.statusCode = statusCode; return streamedLegacy; };
  streamedLegacy.end = () => streamedLegacy;
  await handler(streamedLegacyRequest, streamedLegacy);
  assert.equal(streamedLegacy.statusCode, 204);
  assert.deepEqual(JSON.parse(warnings[0][1]), {
    document: "https://infinite.fast/streamed",
    violatedDirective: "connect-src",
    blocked: "https://unexpected.example/collect",
  });

  warnings.length = 0;
  const modern = await invoke("POST", JSON.stringify([
    { type: "deprecation", body: { message: "must not be logged" } },
    {
      type: "csp-violation",
      age: 12,
      url: "https://infinite.fast/private?not=retained",
      body: {
        documentURL: "https://infinite.fast/privacy/?secret=redacted",
        effectiveDirective: "connect-src",
        blockedURL: "inline",
        disposition: "report",
        sample: "must not be logged",
        statusCode: 200,
      },
    },
  ]), "application/reports+json");
  assert.equal(modern.statusCode, 204);
  assert.equal(warnings.length, 1, "non-CSP Reporting API entries must be ignored");
  assert.deepEqual(JSON.parse(warnings[0][1]), {
    document: "https://infinite.fast/privacy/",
    directive: "connect-src",
    blocked: "inline",
    disposition: "report",
  });

  warnings.length = 0;
  const unsafeLocations = await invoke("POST", {
    "csp-report": {
      "document-uri": "not-a-url?secret=redacted",
      "violated-directive": "img-src",
      "blocked-uri": "data:text/plain,private-payload",
    },
  });
  assert.equal(unsafeLocations.statusCode, 204);
  assert.deepEqual(JSON.parse(warnings[0][1]), { violatedDirective: "img-src" });
  assert.doesNotMatch(warnings[0][1], /redacted|private-payload/);

  warnings.length = 0;
  assert.equal((await invoke("POST", "{malformed", "application/csp-report")).statusCode, 400);
  assert.equal((await invoke("POST", undefined, "application/csp-report")).statusCode, 400);
  assert.equal((await invoke("POST", {}, "application/json")).statusCode, 415);
  assert.equal((await invoke("POST", "x".repeat(64 * 1024 + 1), "application/csp-report")).statusCode, 413);
  assert.equal((await invoke("POST", Array.from({ length: 21 }, () => ({ type: "csp-violation", body: {} })), "application/reports+json")).statusCode, 413);
  assert.equal((await invoke("POST", {
    "csp-report": { "document-uri": `https://infinite.fast/${"x".repeat(2049)}` },
  })).statusCode, 413);
  assert.equal((await invoke("POST", [{ type: "deprecation", body: {} }], "application/reports+json")).statusCode, 400);
  assert.equal(warnings.length, 0, "rejected and unrelated payloads must not be logged");

  const rejected = await invoke("GET");
  assert.equal(rejected.statusCode, 405);
  assert.equal(rejected.headers.Allow, "POST");
} finally {
  console.warn = originalWarn;
}
