const MAX_BODY_BYTES = 64 * 1024;
const MAX_REPORTS = 20;
const MAX_URI_BYTES = 2048;
const MAX_DIRECTIVE_BYTES = 256;
const MAX_DISPOSITION_BYTES = 32;
const MAX_LOGGED_URI_BYTES = 512;

class ReportError extends Error {
  constructor(statusCode) {
    super(`invalid CSP report (${statusCode})`);
    this.statusCode = statusCode;
  }
}

function boundedString(value, maxBytes) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  if (Buffer.byteLength(value, "utf8") > maxBytes) throw new ReportError(413);
  return value;
}

function safeUri(value) {
  const bounded = boundedString(value, MAX_URI_BYTES);
  if (!bounded) return undefined;
  if (["inline", "eval", "self"].includes(bounded)) return bounded;

  try {
    const url = new URL(bounded);
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    return `${url.origin}${url.pathname}`.slice(0, MAX_LOGGED_URI_BYTES);
  } catch (_error) {
    return undefined;
  }
}

function rawBodyString(body) {
  if (typeof body === "string") return body;
  if (body instanceof ArrayBuffer) return Buffer.from(body).toString("utf8");
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength).toString("utf8");
  return undefined;
}

async function readStreamBody(req) {
  if (!req || typeof req[Symbol.asyncIterator] !== "function") return undefined;
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_BODY_BYTES) throw new ReportError(413);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseBody(body) {
  const raw = rawBodyString(body);
  if (raw !== undefined) {
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) throw new ReportError(413);
    try {
      return JSON.parse(raw);
    } catch (_error) {
      throw new ReportError(400);
    }
  }

  try {
    const serialized = JSON.stringify(body);
    if (!serialized) throw new ReportError(400);
    if (Buffer.byteLength(serialized, "utf8") > MAX_BODY_BYTES) throw new ReportError(413);
  } catch (error) {
    if (error instanceof ReportError) throw error;
    throw new ReportError(400);
  }
  return body;
}

function reportBodies(contentType, body) {
  if (contentType === "application/csp-report") {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ReportError(400);
    const report = body["csp-report"] ?? body;
    if (!report || typeof report !== "object" || Array.isArray(report)) throw new ReportError(400);
    return [report];
  }

  if (!Array.isArray(body)) throw new ReportError(400);
  if (body.length > MAX_REPORTS) throw new ReportError(413);
  const reports = body
    .filter((entry) => entry?.type === "csp-violation")
    .map((entry) => entry?.body)
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
  if (reports.length === 0) throw new ReportError(400);
  return reports;
}

function sanitizeReport(report) {
  const sanitized = {
    document: safeUri(report["document-uri"] ?? report.documentURL),
    directive: boundedString(report["effective-directive"] ?? report.effectiveDirective, MAX_DIRECTIVE_BYTES),
    violatedDirective: boundedString(report["violated-directive"] ?? report.violatedDirective, MAX_DIRECTIVE_BYTES),
    blocked: safeUri(report["blocked-uri"] ?? report.blockedURL),
    disposition: boundedString(report.disposition, MAX_DISPOSITION_BYTES),
  };
  return Object.fromEntries(Object.entries(sanitized).filter(([, value]) => value !== undefined));
}

export default async function cspReport(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const rawContentType = req.headers?.["content-type"];
  const contentType = (Array.isArray(rawContentType) ? rawContentType[0] : rawContentType)
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (!["application/csp-report", "application/reports+json"].includes(contentType)) {
    return res.status(415).end();
  }

  try {
    const body = parseBody(req.body ?? await readStreamBody(req));
    const reports = reportBodies(contentType, body);
    const sanitized = reports.map(sanitizeReport);
    if (sanitized.some((report) => Object.keys(report).length === 0)) throw new ReportError(400);
    for (const report of sanitized) console.warn("csp_violation", JSON.stringify(report));
    return res.status(204).end();
  } catch (error) {
    return res.status(error instanceof ReportError ? error.statusCode : 400).end();
  }
}
