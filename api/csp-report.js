function safeUri(value) {
  if (!value || typeof value !== "string") return undefined;
  if (["inline", "eval", "self"].includes(value)) return value;

  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch (_error) {
    return value.slice(0, 200);
  }
}

module.exports = function cspReport(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (_error) {
      body = {};
    }
  }

  const report = body?.["csp-report"] ?? body ?? {};
  console.warn("csp_violation", JSON.stringify({
    document: safeUri(report["document-uri"] ?? report.documentURL),
    directive: report["effective-directive"] ?? report.effectiveDirective,
    violatedDirective: report["violated-directive"] ?? report.violatedDirective,
    blocked: safeUri(report["blocked-uri"] ?? report.blockedURL),
    disposition: report.disposition,
  }));

  return res.status(204).end();
};
