import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../../api/csp-report.js");
const originalWarn = console.warn;
console.warn = () => {};

const invoke = (method, body) => {
  const response = { headers: {}, statusCode: 200 };
  response.setHeader = (key, value) => { response.headers[key] = value; };
  response.status = (statusCode) => { response.statusCode = statusCode; return response; };
  response.end = () => response;
  handler({ method, body }, response);
  return response;
};

const accepted = invoke("POST", {
  "csp-report": {
    "document-uri": "https://infinite.fast/tools/?secret=redacted",
    "violated-directive": "script-src-elem",
    "effective-directive": "script-src-elem",
    "blocked-uri": "https://unexpected.example/script.js?token=redacted",
    disposition: "enforce",
  },
});
assert.equal(accepted.statusCode, 204);
assert.equal(accepted.headers["Cache-Control"], "no-store");

const rejected = invoke("GET");
assert.equal(rejected.statusCode, 405);
assert.equal(rejected.headers.Allow, "POST");
console.warn = originalWarn;
