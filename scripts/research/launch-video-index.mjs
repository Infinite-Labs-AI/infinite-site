/**
 * The Launch Video Index — the study, rendered to static HTML at /research/launch-videos/.
 *
 * PORTED FROM 1bu-1 (src/components/playbooks/launch-video-index.tsx) on 2026-08-19 and DELETED
 * there. The page is marketing content on infinite.fast, not app functionality, so it has no
 * business being rendered by the app: it needs no database, no session and no server at request
 * time. Everything below is pure string-building, which is exactly why it can be a file.
 *
 * The charts are the authority spend. Each is a hand-drawn inline SVG from the small helpers below
 * — one FORM per finding, not one chart repeated — because a chart library cannot ship in a page
 * that is assembled as a string, and hand-drawn SVG stays sharp at any zoom. Every number comes
 * from the verified 194-video corpus. Medians, not means: the corpus has a 14M-view outlier and a
 * mean would be a lie.
 *
 * The page commits to ONE light palette rather than inheriting the viewer theme, and ships its own
 * reset and type scale, because it is a magazine-feature analogue rather than a site page. That is
 * why the CSS below styles bare `body`/`h2`.
 *
 * NOTE FOR EDITORS: a single backtick inside the CSS/HTML strings terminates the template literal.
 * The FAQ copy here must stay identical to LAUNCH_VIDEO_FAQ in launch-video-faq.mjs — the two ship
 * as visible markup and as FAQPage JSON-LD, and Google drops the rich result when they disagree.
 * test-launch-video-pages.mjs fails if they drift.
 */
const fmt = (n) => n.toLocaleString("en-US");
const svgOpen = (w, h) => `<svg viewBox="0 0 ${w} ${h}" class="chart-svg" role="img" preserveAspectRatio="xMidYMid meet">`;
function logDots(rows, opts) {
  const W = 720, labelW = 178, rightPad = 88;
  const x0 = labelW, x1 = W - rightPad, plotW = x1 - x0;
  const padTop = 32, rowH = 58, padBottom = 16;
  const H = padTop + rows.length * rowH + padBottom;
  const lmin = Math.log10(opts.domainMin), lmax = Math.log10(opts.domainMax);
  const xFor = (v) => x0 + (Math.log10(v) - lmin) / (lmax - lmin) * plotW;
  const grid = opts.ticks.map((t) => {
    const x = xFor(t);
    const lab = t >= 1e3 ? `${t / 1e3}k` : `${t}`;
    return `<line x1="${x}" y1="${padTop}" x2="${x}" y2="${H - padBottom}" class="c-grid"/><text x="${x}" y="${padTop - 11}" class="c-tick" text-anchor="middle">${lab}</text>`;
  }).join("");
  const marks = rows.map((r, i) => {
    const cy = padTop + i * rowH + rowH / 2;
    const cx = xFor(r.value);
    const rad = r.hot ? 9 : 6.5;
    const cls = r.hot ? "d-hot" : "d-cool";
    const nlab = r.n != null ? `<text x="${labelW - 14}" y="${cy + 15}" class="c-n" text-anchor="end">n=${r.n}</text>` : "";
    return `<g><text x="${labelW - 14}" y="${cy - 2}" class="c-lab" text-anchor="end">${r.label}</text>${nlab}<line x1="${x0}" y1="${cy}" x2="${cx}" y2="${cy}" class="c-stem"/><circle cx="${cx}" cy="${cy}" r="${rad}" class="${cls}"/><text x="${cx + rad + 9}" y="${cy + 5}" class="c-val">${fmt(r.value)}</text></g>`;
  }).join("");
  return svgOpen(W, H) + grid + marks + `</svg>`;
}
function bubbles(items) {
  const W = 720, rMax = 54;
  const maxV = Math.max(...items.map((i) => i.value));
  const band = W / items.length;
  const cyC = 34 + rMax;
  const H = cyC + rMax + 54;
  const marks = items.map((it, i) => {
    const cx = band * (i + 0.5);
    const r = Math.max(15, Math.sqrt(it.value / maxV) * rMax);
    const cls = it.hot ? "d-hot" : "d-cool";
    const nlab = it.n != null ? `<text x="${cx}" y="${H - 12}" class="c-n" text-anchor="middle">n=${it.n}</text>` : "";
    return `<g><text x="${cx}" y="${cyC - r - 12}" class="c-val" text-anchor="middle">${fmt(it.value)}</text><circle cx="${cx}" cy="${cyC}" r="${r}" class="${cls}"/><text x="${cx}" y="${H - 32}" class="c-lab" text-anchor="middle">${it.label}</text>${nlab}</g>`;
  }).join("");
  return svgOpen(W, H) + marks + `</svg>`;
}
function dominanceBars(rows, opts) {
  const W = 720, labelW = 168, calloutW = 140, rightMargin = 8;
  const calloutX = W - rightMargin - calloutW;
  const x0 = labelW, barEnd = 470, plotW = barEnd - x0;
  const padTop = 12, rowH = 52, padBottom = 12;
  const H = padTop + rows.length * rowH + padBottom;
  const maxV = Math.max(...rows.map((r) => r.value));
  const bars = rows.map((r, i) => {
    const cy = padTop + i * rowH + rowH / 2;
    const bh = 24, by = cy - bh / 2;
    const w = Math.max(3, r.value / maxV * plotW);
    const cls = r.hot ? "b-hot" : "b-cool";
    const nlab = r.n != null ? `<text x="${labelW - 12}" y="${cy + 15}" class="c-n" text-anchor="end">n=${r.n}</text>` : "";
    return `<g><text x="${labelW - 12}" y="${cy - 2}" class="c-lab" text-anchor="end">${r.label}</text>${nlab}<rect x="${x0}" y="${by}" width="${w}" height="${bh}" rx="4" class="${cls}"/><text x="${x0 + w + 10}" y="${cy + 5}" class="c-val">${fmt(r.value)}</text></g>`;
  }).join("");
  const ccx = calloutX + calloutW / 2;
  const callout = `<g><rect x="${calloutX}" y="${padTop}" width="${calloutW}" height="${H - padTop - padBottom}" rx="12" class="callout-bg"/><text x="${ccx}" y="${H / 2 - 2}" class="callout-big" text-anchor="middle">${opts.multiple}</text><text x="${ccx}" y="${H / 2 + 22}" class="callout-sub" text-anchor="middle">${opts.sub}</text></g>`;
  return svgOpen(W, H) + bars + callout + `</svg>`;
}
function aspectPanels(a, b, opts) {
  const W = 720, yB = 208, H = yB + 58;
  const panel = (d, cx) => {
    const x = cx - d.w / 2, y = yB - d.h;
    const cls = d.hot ? "frame-hot" : "frame-cool";
    const nlab = d.n != null ? `<text x="${cx}" y="${yB + 42}" class="c-n" text-anchor="middle">n=${d.n}</text>` : "";
    return `<g><text x="${cx}" y="${y - 12}" class="c-val" text-anchor="middle">${fmt(d.value)}</text><rect x="${x}" y="${y}" width="${d.w}" height="${d.h}" rx="8" class="${cls}"/><text x="${cx}" y="${yB + 24}" class="c-lab" text-anchor="middle">${d.label}</text>${nlab}</g>`;
  };
  const mid = `<g><text x="360" y="128" class="mult-big" text-anchor="middle">${opts.multiple}</text><text x="360" y="152" class="mult-sub" text-anchor="middle">${opts.sub}</text></g>`;
  return svgOpen(W, H) + panel(a, 178) + mid + panel(b, 542) + `</svg>`;
}
function lollipop(rows, opts = {}) {
  const W = 720, labelW = 168, rightPad = 96;
  const x0 = labelW, x1 = W - rightPad, plotW = x1 - x0;
  const padTop = 8, rowH = 52, padBottom = 8;
  const H = padTop + rows.length * rowH + padBottom;
  const maxV = opts.max ?? Math.max(...rows.map((r) => r.value));
  const marks = rows.map((r, i) => {
    const cy = padTop + i * rowH + rowH / 2;
    const cx = x0 + Math.max(2, r.value / maxV * plotW);
    const rad = r.hot ? 8 : 6;
    const cls = r.hot ? "d-hot" : "d-cool";
    const nlab = r.n != null ? `<text x="${labelW - 12}" y="${cy + 15}" class="c-n" text-anchor="end">n=${r.n}</text>` : "";
    return `<g><text x="${labelW - 12}" y="${cy - 2}" class="c-lab" text-anchor="end">${r.label}</text>${nlab}<line x1="${x0}" y1="${cy}" x2="${cx}" y2="${cy}" class="c-stem"/><circle cx="${cx}" cy="${cy}" r="${rad}" class="${cls}"/><text x="${cx + rad + 9}" y="${cy + 5}" class="c-val">${fmt(r.value)}</text></g>`;
  }).join("");
  return svgOpen(W, H) + marks + `</svg>`;
}
function vcolumns(items, opts = {}) {
  const W = 720, padTop = 30, plotH = 196, axisPad = 46, sidePad = 16;
  const H = padTop + plotH + axisPad;
  const maxV = opts.max ?? Math.max(...items.map((i) => i.value));
  const plotW = W - 2 * sidePad;
  const band = plotW / items.length;
  const barW = Math.min(34, band * 0.44);
  const baseY = padTop + plotH;
  const cols = items.map((it, i) => {
    const cxBand = sidePad + band * (i + 0.5);
    const bx = cxBand - barW / 2;
    const bh = Math.max(2, it.value / maxV * plotH);
    const by = baseY - bh;
    const cls = it.hot ? "b-hot" : it.dim ? "b-dim" : "b-cool";
    const nlab = it.n != null ? `<text x="${cxBand}" y="${baseY + 36}" class="c-n" text-anchor="middle">n=${it.n}</text>` : "";
    return `<g><text x="${cxBand}" y="${by - 8}" class="c-val" text-anchor="middle">${fmt(it.value)}</text><rect x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="4" class="${cls}"/><text x="${cxBand}" y="${baseY + 20}" class="c-axlab" text-anchor="middle">${it.label}</text>${nlab}</g>`;
  }).join("");
  const axis = `<line x1="${sidePad}" y1="${baseY}" x2="${W - sidePad}" y2="${baseY}" class="c-axis"/>`;
  return svgOpen(W, H) + axis + cols + `</svg>`;
}
function rankedMeters(rows, opts) {
  const W = 720, labelW = 178, rightPad = 74;
  const x0 = labelW, x1 = W - rightPad, trackW = x1 - x0;
  const padTop = 6, rowH = 38, padBottom = 6;
  const H = padTop + rows.length * rowH + padBottom;
  const marks = rows.map((r, i) => {
    const cy = padTop + i * rowH + rowH / 2;
    const bh = 12, by = cy - bh / 2;
    const w = r.value / opts.max * trackW;
    const cls = r.hot ? "b-hot" : "b-cool";
    const dcls = r.hot ? "d-hot" : "d-cool";
    const disp = r.display ?? fmt(r.value);
    return `<g><text x="${labelW - 14}" y="${cy + 5}" class="c-lab" text-anchor="end">${r.label}</text><rect x="${x0}" y="${by}" width="${trackW}" height="${bh}" rx="6" class="c-track"/><rect x="${x0}" y="${by}" width="${w}" height="${bh}" rx="6" class="${cls}"/><circle cx="${x0 + w}" cy="${cy}" r="6" class="${dcls}"/><text x="${x0 + w + 14}" y="${cy + 5}" class="c-val">${disp}</text></g>`;
  }).join("");
  return svgOpen(W, H) + marks + `</svg>`;
}
function heroSplit(a, b, opts) {
  const W = 720, H = 210;
  const y0 = 118, ph = 82, gap = 16;
  const pw = (W - gap) / 2;
  const plate = (d, x, kind) => {
    const nlab = d.n != null ? `<text x="${x + pw - 20}" y="${y0 + 34}" class="plate-n" text-anchor="end">n=${d.n}</text>` : "";
    return `<rect x="${x}" y="${y0}" width="${pw}" height="${ph}" rx="12" class="plate-${kind}"/><text x="${x + 22}" y="${y0 + 42}" class="hero-val-${kind}">${fmt(d.value)}</text><text x="${x + 22}" y="${y0 + 65}" class="plate-lab">${d.label}</text>${nlab}`;
  };
  const head = `<text x="360" y="56" class="hero-mult" text-anchor="middle">${opts.multiple}</text><text x="360" y="86" class="hero-sub" text-anchor="middle">${opts.sub}</text>`;
  return svgOpen(W, H) + head + plate(a, 0, "a") + plate(b, pw + gap, "b") + `</svg>`;
}
// Same-origin, immutable-cached path (see vercel.json). The bucket serves no-cache.
const VBASE = "/lv";
function vembed(slug, opts = {}) {
  const head = opts.title || opts.tag ? `<figcaption class="v-cap"><b>${opts.title ?? ""}</b>${opts.meta ? ` &middot; ${opts.meta}` : ""}${opts.tag ? `<span class="v-tag">${opts.tag}</span>` : ""}</figcaption>` : "";
  return `<figure class="vembed">
    <video controls preload="none" playsinline poster="${VBASE}/${slug}.jpg"><source src="${VBASE}/${slug}.mp4" type="video/mp4"></video>
    ${head}
  </figure>`;
}
function filmstrip(items) {
  const cards = items.map(
    (it) => `<figure class="fs-card">
      <video controls preload="none" playsinline poster="${VBASE}/${it.slug}.jpg"><source src="${VBASE}/${it.slug}.mp4" type="video/mp4"></video>
      <figcaption><b>${it.title}</b><span>${it.meta}</span></figcaption>
    </figure>`
  ).join("");
  return `<div class="filmstrip">${cards}</div>`;
}
const PLAYBOOK_CSS = `/* ============================================================
   The Launch Video Index \u2014 longform editorial + data treatment.
   A single committed light world (like the Reddit playbook): every colour is
   painted explicitly, not inherited from the viewer theme, because this is a
   magazine-feature analogue on a light publication. The accent is an electric
   blue, because emotional pull, not clarity, is the thesis of the whole study.
   ============================================================ */
:root{
  --paper:#fafbfd;  --card:#ffffff;
  --ink:#0f1729;    --body:#3f4650;  --mut:#79838f;
  --rule:#e1e6eb;   --rule-2:#eef2f6;
  --deep:#070b14;   --deep-2:#0f1830; --deep-mut:#93a2c4;
  --acc:#2f6bff;    --acc-ink:#1a49c9;  --acc-soft:#eaf1ff;
  --volt:#2f6bff;   --volt-2:#61e0ff;
  --gold:#e0a33a;   --gold-ink:#a8741c;
  --pos:#1aa06a;    --pos-ink:#0a7a4b;  --pos-wash:rgba(26,160,106,.16);
  --neg:#e0673f;    --neg-ink:#b8452a;  --neg-wash:rgba(224,103,63,.18);
  --hot:#2f6bff;    --cool:#c3d2ea;
  --link:#2f6bff;
  --disp:"HankenGrotesk",-apple-system,"Helvetica Neue",Arial,sans-serif;
  --sans:"IBMPlexSans",-apple-system,"Helvetica Neue",Arial,sans-serif;
  --mono:"IBMPlexMono",ui-monospace,SFMono-Regular,Menlo,monospace;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--body);font-family:var(--sans);
  font-size:19px;line-height:1.72;letter-spacing:-0.004em;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:var(--disp);margin:0;color:var(--ink);text-wrap:balance;letter-spacing:-0.03em}
p{margin:0}
a{color:inherit}
img{display:block;max-width:100%}
:focus-visible{outline:2px solid var(--acc);outline-offset:3px;border-radius:3px}

.wrap{display:grid;grid-template-columns:
  [bleed-start] minmax(20px,1fr)
  [wide-start] minmax(0,150px)
  [text-start] minmax(0,66ch) [text-end]
  minmax(0,150px) [wide-end]
  minmax(20px,1fr) [bleed-end];}
.wrap > *{grid-column:text}
.wrap > .wide{grid-column:wide}
.wrap > .bleed{grid-column:bleed}

.prog{position:fixed;top:0;left:0;right:0;height:3px;z-index:60}
.prog i{display:block;height:100%;width:0;background:var(--acc);transition:width .1s linear}

.bar{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;gap:12px;
  padding:15px 26px;border-bottom:1px solid transparent;transition:background .3s,border-color .3s}
.bar.is-stuck{background:rgba(250,251,253,.97);border-bottom-color:var(--rule)}
.bar .mark{display:flex;align-items:center;gap:9px;font-family:var(--disp);font-weight:800;
  font-size:15px;letter-spacing:-0.024em;color:#fff;transition:color .3s}
.bar.is-stuck .mark{color:var(--ink)}
.bar .mark i{width:8px;height:8px;border-radius:50%;background:var(--acc);flex:none}
.bar .rt{margin-left:auto;font-family:var(--mono);font-size:11.5px;letter-spacing:.1em;
  text-transform:uppercase;color:rgba(255,255,255,.7);transition:color .3s}
.bar.is-stuck .rt{color:var(--mut)}

/* ---------- HERO ---------- */
.hero{position:relative;background:var(--deep);color:#fff;min-height:min(94vh,880px);
  display:flex;align-items:flex-end;overflow:hidden}
.hero-vid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.hero::before{content:"";position:absolute;inset:0;z-index:1;
  background:linear-gradient(180deg,rgba(7,11,20,.34) 0%,rgba(7,11,20,.5) 42%,rgba(7,11,20,.9) 100%),
    radial-gradient(120% 90% at 82% 8%,rgba(47,107,255,.2),transparent 60%)}
.hero .in{position:relative;z-index:2;width:100%;padding:0 0 70px}
.kicker{display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12px;
  letter-spacing:.2em;text-transform:uppercase;color:var(--volt-2)}
.kicker i{width:7px;height:7px;border-radius:50%;background:var(--acc);flex:none;
  box-shadow:0 0 0 4px rgba(47,107,255,.25)}
.hero h1{color:#fff;font-size:clamp(40px,8.2vw,104px);line-height:.94;letter-spacing:-0.044em;
  font-weight:800;margin-top:24px;max-width:16ch}
.hero h1 em{font-style:normal;color:var(--volt-2)}
.hero .deck{margin-top:26px;max-width:52ch;font-size:clamp(18px,2.1vw,23px);line-height:1.5;
  color:rgba(255,255,255,.84)}
.hero .by{display:flex;align-items:center;gap:14px;margin-top:40px;padding-top:22px;
  border-top:1px solid rgba(255,255,255,.17)}
.hero .av{width:42px;height:42px;border-radius:50%;flex:none;object-fit:cover;
  box-shadow:0 0 0 1px rgba(255,255,255,.28);background:var(--deep-2)}
.hero .who{font-size:15px;font-weight:600;color:#fff;line-height:1.35;font-style:normal}
.hero .who span{display:block;font-weight:400;font-size:12.5px;color:var(--deep-mut);
  font-family:var(--mono);letter-spacing:.03em}
.hero .stamp{margin-left:auto;text-align:right;font-family:var(--mono);font-size:11.5px;
  color:var(--deep-mut);line-height:1.7}

/* ---------- body ---------- */
.wrap > p{margin:0 0 26px}
.stand{font-size:clamp(21px,2.4vw,26px);line-height:1.5;color:var(--ink);
  margin:60px 0 32px !important;letter-spacing:-0.014em}
h2{font-size:clamp(28px,3.6vw,42px);line-height:1.08;font-weight:800;margin:78px 0 8px;max-width:20ch}
h2 .n{display:block;font-family:var(--mono);font-size:12px;font-weight:400;letter-spacing:.18em;
  text-transform:uppercase;color:var(--acc-ink);margin-bottom:15px}
h3{font-size:clamp(20px,2.2vw,25px);line-height:1.22;font-weight:700;margin:48px 0 14px;max-width:26ch}
.wrap strong{color:var(--ink);font-weight:600}
.wrap em{font-style:italic}
a.ref{color:var(--ink);text-decoration:none;border-bottom:1px solid var(--rule);padding-bottom:1px}
a.ref:hover{border-bottom-color:var(--acc);color:var(--acc-ink)}
ul.lede{margin:0 0 26px;padding:0;list-style:none;display:grid;gap:14px}
ul.lede li{position:relative;padding-left:28px}
ul.lede li::before{content:"";position:absolute;left:2px;top:14px;width:12px;height:2px;
  background:var(--acc);border-radius:2px}

blockquote.pull{margin:56px 0;padding:0 0 0 28px;border-left:3px solid var(--gold);
  font-family:var(--disp);font-size:clamp(24px,3.3vw,36px);line-height:1.2;
  letter-spacing:-0.03em;font-weight:700;color:var(--ink)}
blockquote.pull cite{display:block;margin-top:18px;font-family:var(--mono);font-size:12.5px;
  font-style:normal;letter-spacing:.06em;color:var(--mut);font-weight:400}

/* ---------- charts ---------- */
figure.chart{margin:44px 0}
figure.chart.wide{margin:52px 0}
.chart-card{background:var(--card);border:1px solid var(--rule);border-radius:16px;
  padding:26px 26px 20px;box-shadow:0 14px 40px rgba(15,23,41,.06)}
.chart-head{font-family:var(--mono);font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--acc-ink);margin-bottom:4px}
.chart-title{font-family:var(--disp);font-size:clamp(18px,2.1vw,23px);font-weight:700;
  letter-spacing:-0.02em;color:var(--ink);line-height:1.22;margin-bottom:20px;max-width:30ch}
.chart-svg{width:100%;height:auto;display:block}
.chart-svg text{dominant-baseline:auto}
.chart-svg .c-lab{font-family:var(--sans);font-size:14px;font-weight:600;fill:var(--ink)}
.chart-svg .c-axlab{font-family:var(--sans);font-size:13px;font-weight:600;fill:var(--ink)}
.chart-svg .c-n{display:none}
.chart-svg .c-val{font-family:var(--mono);font-size:14px;font-weight:600;fill:var(--ink)}
.chart-svg .c-tick{font-family:var(--mono);font-size:10.5px;fill:var(--mut)}
.chart-svg .b-cool{fill:var(--cool)}
.chart-svg .b-hot{fill:var(--hot)}
.chart-svg .b-dim{fill:#d8e1ef}
.chart-svg .c-track{fill:var(--rule-2)}
/* axes + gridlines: solid hairlines, one step off the card surface */
.chart-svg .c-axis{stroke:var(--rule);stroke-width:1}
.chart-svg .c-grid{stroke:var(--rule-2);stroke-width:1}
.chart-svg .c-stem{stroke:var(--cool);stroke-width:2;stroke-linecap:round}
/* dots carry a 2px surface ring so they stay legible where they overlap a track or stem */
.chart-svg .d-hot{fill:var(--hot);stroke:var(--card);stroke-width:2}
.chart-svg .d-cool{fill:var(--cool);stroke:var(--card);stroke-width:2}
/* dominance-bar multiple callout */
.chart-svg .callout-bg{fill:var(--acc-soft)}
.chart-svg .callout-big{font-family:var(--disp);font-size:30px;font-weight:800;letter-spacing:-0.03em;fill:var(--acc-ink)}
.chart-svg .callout-sub{font-family:var(--mono);font-size:10px;letter-spacing:.02em;fill:var(--acc-ink)}
/* aspect-ratio panels */
.chart-svg .frame-hot{fill:var(--hot)}
.chart-svg .frame-cool{fill:var(--cool)}
.chart-svg .mult-big{font-family:var(--disp);font-size:34px;font-weight:800;letter-spacing:-0.03em;fill:var(--acc-ink)}
.chart-svg .mult-sub{font-family:var(--mono);font-size:10.5px;fill:var(--mut)}
/* data table beside each chart (archetype-original-research: the liftable asset) */
.dtable{width:100%;border-collapse:collapse;margin:22px 0 2px;font-family:var(--mono)}
.dtable th{text-align:left;font-weight:600;color:var(--mut);text-transform:uppercase;
  letter-spacing:.07em;font-size:10px;padding:0 0 9px;border-bottom:1px solid var(--rule)}
.dtable td{font-size:13px;padding:9px 0;border-bottom:1px solid var(--rule-2);color:var(--ink)}
.dtable td.num,.dtable th.num{text-align:right;font-variant-numeric:tabular-nums;padding-left:18px;
  white-space:nowrap}
.dtable tbody tr:last-child td{border-bottom:0}
.dtable tr.hot td{color:var(--acc-ink);font-weight:600}

/* face-vs-text collage */
.ftgrid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:14px 0 4px}
.ftcol{border:1px solid var(--rule);border-radius:16px;padding:16px 16px 18px;background:var(--paper)}
.ftcol.face{border-color:rgba(47,107,255,.3);background:rgba(47,107,255,.03)}
.ftlbl{margin:2px 0 15px;font-family:var(--mono);font-size:11px;letter-spacing:.11em;
  text-transform:uppercase;font-weight:600;color:var(--mut)}
.ftcol.face .ftlbl{color:var(--acc-ink)}
.ftcards{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ftc{margin:0;display:block;text-decoration:none;color:inherit}
.ftthumb{position:relative;display:block;width:100%;aspect-ratio:16/10;border-radius:10px;overflow:hidden;
  background-color:#0b0f18;background-size:cover;background-position:center top}
.ftthumb::after{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(7,11,20,0) 52%,rgba(7,11,20,.34))}
.ftplay{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;
  width:42px;height:42px;border-radius:50%;background:rgba(10,14,24,.62);
  display:grid;place-items:center;transition:transform .15s ease,background .15s ease}
.ftplay::before{content:"";width:0;height:0;margin-left:3px;border-left:12px solid #fff;
  border-top:7.5px solid transparent;border-bottom:7.5px solid transparent}
.ftc:hover .ftplay{transform:translate(-50%,-50%) scale(1.09);background:var(--acc)}
.ftcap{display:flex;align-items:baseline;gap:8px;margin-top:8px;font-size:12.5px;line-height:1.3}
.ftcap b{font-weight:600;color:var(--ink)}
.ftcap .v{margin-left:auto;font-family:var(--mono);font-weight:600;font-size:11.5px;color:var(--acc-ink);
  font-variant-numeric:tabular-nums}
.ftnote{font-family:var(--mono);font-size:12px;line-height:1.6;color:var(--mut);
  margin:14px 0 0!important;max-width:70ch}
.ftnote strong{color:var(--ink);font-weight:600}

/* hero-multiple split */
.chart-svg .hero-mult{font-family:var(--disp);font-size:46px;font-weight:800;letter-spacing:-0.035em;fill:var(--acc-ink)}
.chart-svg .hero-sub{font-family:var(--mono);font-size:12px;fill:var(--mut)}
.chart-svg .plate-a{fill:var(--acc-soft)}
.chart-svg .plate-b{fill:var(--paper);stroke:var(--rule);stroke-width:1}
.chart-svg .hero-val-a{font-family:var(--disp);font-size:30px;font-weight:800;letter-spacing:-0.02em;fill:var(--acc-ink)}
.chart-svg .hero-val-b{font-family:var(--disp);font-size:30px;font-weight:800;letter-spacing:-0.02em;fill:var(--ink)}
.chart-svg .plate-lab{font-family:var(--sans);font-size:13px;font-weight:600;fill:var(--body)}
.chart-svg .plate-n{display:none}
figure.chart figcaption{margin-top:14px;font-family:var(--mono);font-size:12.5px;line-height:1.6;
  color:var(--mut);border-left:2px solid var(--acc);padding-left:12px;max-width:64ch}
figure.chart figcaption b{color:var(--ink);font-weight:500}

/* ---------- video embeds ---------- */
.vembed{margin:44px 0}
.vembed video{width:100%;display:block;border-radius:16px;background:#000;aspect-ratio:16/9;object-fit:cover;box-shadow:0 16px 44px rgba(15,23,41,.14)}
.vembed .v-cap{margin-top:14px;font-family:var(--mono);font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.vembed .v-cap b{font-family:var(--disp);font-size:15px;font-weight:700;color:var(--ink);letter-spacing:-0.01em}
.v-tag{margin-left:auto;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--acc-ink);background:var(--acc-soft);border:1px solid #cfe0ff;border-radius:99px;padding:2px 10px}
.wrap > .vpair{grid-column:bleed}
.vpair{display:grid;grid-template-columns:1fr auto 1fr;gap:26px;align-items:center;margin:52px 0}
.vp-side{margin:0;min-width:0}
.vp-frame{position:relative;border-radius:16px;overflow:hidden;line-height:0}
.vp-frame video{width:100%;display:block;aspect-ratio:16/9;object-fit:cover;background:#000}
.vp-side.win .vp-frame{box-shadow:0 0 0 3px var(--pos),0 24px 60px rgba(26,160,106,.22)}
.vp-side.lose .vp-frame{box-shadow:0 0 0 3px var(--neg)}
.vp-side.lose{opacity:.85}
.vp-badge{position:absolute;left:14px;top:14px;z-index:2;font-family:var(--disp);font-weight:800;
  font-size:clamp(20px,2.4vw,30px);letter-spacing:-0.02em;line-height:1;color:#fff;
  padding:9px 13px 8px;border-radius:12px;box-shadow:0 6px 18px rgba(7,11,20,.28)}
.vp-side.win .vp-badge{background:var(--pos)}
.vp-side.lose .vp-badge{background:var(--neg)}
.vp-badge em{display:block;font-family:var(--mono);font-style:normal;font-weight:400;font-size:9px;
  text-transform:uppercase;letter-spacing:.14em;opacity:.9;margin-top:4px}
.vpair figcaption{margin-top:13px;font-family:var(--mono);font-size:12.5px;color:var(--mut);line-height:1.55}
.vpair figcaption b{font-family:var(--disp);font-size:16px;font-weight:800;letter-spacing:-0.01em;
  display:block;margin-bottom:3px}
.vp-side.win figcaption b{color:var(--pos-ink)}
.vp-side.lose figcaption b{color:var(--neg-ink)}
.vp-mid{text-align:center;flex:none}
.vp-mult{display:block;font-family:var(--disp);font-weight:800;font-size:clamp(30px,4.6vw,54px);
  color:var(--gold-ink);letter-spacing:-0.035em;line-height:.95}
.vp-mlab{display:block;margin-top:6px;font-family:var(--mono);font-size:10.5px;text-transform:uppercase;
  letter-spacing:.13em;color:var(--mut)}
/* full-bleed film-strip breakers */
.wrap > .breaker{grid-column:bleed}
.breaker{margin:58px 0}
.breaker img{width:100%;display:block;border-radius:14px;background:#0b0f18}
.breaker figcaption{margin-top:11px;font-family:var(--mono);font-size:11px;color:var(--mut);
  letter-spacing:.04em;text-align:center;text-transform:uppercase}
.wrap > .filmstrip{grid-column:wide}
.filmstrip{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px;margin:36px 0}
.fs-card{margin:0}
.fs-card video{width:100%;display:block;border-radius:12px;background:#000;aspect-ratio:16/9;object-fit:cover}
.fs-card figcaption{margin-top:8px;line-height:1.3}
.fs-card figcaption b{display:block;font-family:var(--disp);font-size:14px;font-weight:700;color:var(--ink);letter-spacing:-0.01em}
.fs-card figcaption span{font-family:var(--mono);font-size:11px;color:var(--mut)}
@media(max-width:640px){.vpair{grid-template-columns:1fr}}

/* ---------- good vs bad tweets scorecard ---------- */
.wrap > .tweetvs{grid-column:bleed}
.tweetvs{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:40px 0}
.tvs-col{display:flex;flex-direction:column;gap:12px}
.tvs-head{font-family:var(--disp);font-weight:800;font-size:15.5px;letter-spacing:-0.014em;padding:11px 15px;border-radius:11px;display:flex;align-items:center;gap:9px}
.tvs-head i{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex:none;color:#fff}
.tvs-col.good .tvs-head{color:var(--pos-ink);background:#e7f7ef;border:1px solid #bfe8d4}
.tvs-col.good .tvs-head i{background:var(--pos)}
.tvs-col.bad .tvs-head{color:var(--neg-ink);background:#fdeee9;border:1px solid #f3d2c8}
.tvs-col.bad .tvs-head i{background:var(--neg)}
/* real-tweet card */
.tw{background:var(--card);border:1px solid var(--rule);border-radius:15px;padding:14px 16px 13px;
  box-shadow:0 6px 18px rgba(15,23,41,.05)}
.tw-h{display:flex;align-items:center;gap:10px}
.tw-av{width:40px;height:40px;border-radius:50%;flex:none;object-fit:cover;background:var(--rule-2)}
.tw-id{display:flex;flex-direction:column;line-height:1.18;min-width:0}
.tw-nm{display:flex;align-items:center;gap:4px;font-family:var(--disp);font-weight:700;font-size:14.5px;
  color:var(--ink);letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tw-ck{width:15px;height:15px;flex:none;border-radius:50%;background:var(--acc);position:relative}
.tw-ck::before{content:"";position:absolute;left:4px;top:4.5px;width:6px;height:3px;
  border-left:1.6px solid #fff;border-bottom:1.6px solid #fff;transform:rotate(-45deg)}
.tw-un{font-family:var(--mono);font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.note-inline{margin:0 0 26px;padding:16px 18px;border-left:3px solid var(--acc);background:var(--acc-soft);
  border-radius:0 10px 10px 0;font-size:16.5px;line-height:1.62;color:var(--body)}
.note-inline b{color:var(--ink)}
.tw-vm{margin-left:auto;text-align:right;font-family:var(--disp);font-weight:800;font-size:15.5px;
  line-height:1;letter-spacing:-0.01em;flex:none}
.tw-vm em{display:block;font-family:var(--mono);font-weight:400;font-style:normal;font-size:9px;
  text-transform:uppercase;letter-spacing:.12em;color:var(--mut);margin-top:4px}
.tw.good .tw-vm{color:var(--pos-ink)}
.tw.bad .tw-vm{color:var(--neg-ink)}
.tw-txt{font-size:14.5px;line-height:1.52;color:var(--ink);margin:11px 0 0}
.tw-txt mark{padding:0 3px;border-radius:3px;color:var(--ink)}
.tw.good .tw-txt mark{background:var(--pos-wash)}
.tw.bad .tw-txt mark{background:var(--neg-wash)}
.tw-note{margin:12px 0 0;padding-top:11px;border-top:1px solid var(--rule-2);
  font-size:13.5px;font-weight:600;line-height:1.4}
.tw.good .tw-note{color:var(--pos-ink)}
.tw.bad .tw-note{color:var(--neg-ink)}
@media(max-width:640px){.tweetvs{grid-template-columns:1fr}}

/* ---------- typography plates ---------- */
figure.bleed{margin:80px 0}
.tplate{width:100%;min-height:clamp(300px,54vh,560px);background:var(--deep);
  color:#fff;display:flex;flex-direction:column;justify-content:center;
  padding:clamp(36px,7vw,104px);position:relative;overflow:hidden}
.tplate::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(120% 90% at 88% 4%,rgba(47,107,255,.3),transparent 58%)}
.tplate::before{content:"";position:absolute;left:0;top:clamp(36px,7vw,104px);
  bottom:clamp(36px,7vw,104px);width:5px;background:var(--acc);z-index:2}
.tplate .eyebrow{position:relative;z-index:2;font-family:var(--mono);font-size:12px;letter-spacing:0.16em;
  text-transform:uppercase;color:var(--volt-2);margin-bottom:clamp(18px,3vw,32px)}
.tplate .say{position:relative;z-index:2;font-family:var(--disp);font-weight:600;letter-spacing:-0.032em;
  line-height:1.08;font-size:clamp(30px,5.2vw,64px);max-width:20ch;text-wrap:balance}
.tplate .say em{font-style:normal;color:var(--volt-2)}
.tplate .by{position:relative;z-index:2;font-family:var(--mono);font-size:13px;line-height:1.7;
  color:var(--deep-mut);margin-top:clamp(20px,3vw,34px);max-width:56ch}
.tplate .by b{color:#fff;font-weight:500}

/* ---------- dark interlude / stat grid ---------- */
.interlude{background:linear-gradient(168deg,var(--deep),var(--deep-2));color:#fff;padding:92px 24px;margin:0;
  position:relative;overflow:hidden}
.interlude::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(90% 80% at 90% 0%,rgba(47,107,255,.22),transparent 60%)}
.interlude .in{max-width:960px;margin:0 auto;position:relative;z-index:2}
.interlude .lbl{font-family:var(--mono);font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--volt-2)}
.interlude h2{color:#fff;margin:18px 0 0;font-size:clamp(26px,3.6vw,42px);max-width:20ch}
.interlude p{color:var(--deep-mut);font-size:17.5px;line-height:1.65;margin-top:20px;max-width:60ch}
.interlude .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:42px}
.interlude .grid div{border:1px solid rgba(255,255,255,.15);border-radius:13px;padding:24px;
  background:rgba(255,255,255,.02)}
.interlude .grid b{display:block;font-family:var(--disp);font-size:clamp(30px,4.4vw,46px);font-weight:800;
  letter-spacing:-0.032em;color:#fff}
.interlude .grid b em{font-style:normal;color:var(--gold)}
.interlude .grid span{display:block;margin-top:8px;font-family:var(--mono);font-size:11.5px;
  letter-spacing:.1em;text-transform:uppercase;color:var(--deep-mut)}
.interlude .caveat{margin-top:28px;font-family:var(--mono);font-size:12.5px;color:var(--volt-2);max-width:66ch}

/* ---------- drawn X posts (leaderboard teaser) ---------- */
.xwrap{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:44px 0}
.xp{display:block;text-decoration:none;background:var(--card);border:1px solid var(--rule);
  border-radius:15px;padding:18px 18px 14px;box-shadow:0 10px 30px rgba(15,23,41,.05);transition:transform .18s,box-shadow .18s}
.xp:hover{transform:translateY(-2px);box-shadow:0 18px 44px rgba(15,23,41,.1)}
.xp .top{display:flex;align-items:center;gap:10px}
.xp .rank{font-family:var(--disp);font-weight:800;font-size:15px;color:#fff;background:var(--acc);
  width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex:none}
.xp .who3{font-family:var(--disp);font-weight:700;font-size:15px;color:var(--ink);line-height:1.2}
.xp .who3 span{display:block;font-family:var(--mono);font-weight:400;font-size:11.5px;color:var(--mut);letter-spacing:.02em}
.xp .txt{font-size:14.5px;line-height:1.5;color:var(--body);margin:12px 0 12px}
.xp .stats{display:flex;gap:16px;flex-wrap:wrap;border-top:1px solid var(--rule-2);padding-top:11px}
.xp .stat{font-family:var(--mono);font-size:12px;color:var(--mut)}
.xp .stat b{font-family:var(--disp);font-size:15px;font-weight:700;color:var(--ink);letter-spacing:-0.01em;display:block}
.xp .stat.book b{color:var(--acc-ink)}
.xp-thumb{display:block;width:100%;aspect-ratio:16/9;border-radius:11px;background-size:cover;
  background-position:center;background-color:#0b0f18;margin-bottom:13px;position:relative;overflow:hidden}
.xp-thumb.vid::before{content:"";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  width:0;height:0;border-left:17px solid rgba(255,255,255,.94);border-top:11px solid transparent;
  border-bottom:11px solid transparent;filter:drop-shadow(0 2px 7px rgba(0,0,0,.45))}
.xp:hover .xp-thumb.vid::before{border-left-color:#fff;transform:translate(-50%,-50%) scale(1.08)}
.xp-thumb.removed{display:flex;align-items:center;justify-content:center;font-family:var(--mono);
  font-size:11px;text-transform:uppercase;letter-spacing:.13em;color:var(--neg-ink);background:var(--neg-wash);
  background-image:repeating-linear-gradient(45deg,transparent,transparent 9px,rgba(224,103,63,.09) 9px,rgba(224,103,63,.09) 18px)}
.xp.pulled{background:linear-gradient(180deg,#fff,#fdf3f0);border-color:#f1d3cb}
.xp.pulled .rank{background:var(--neg)}
.xp.pulled .stat b{color:var(--neg-ink)}
/* Ollie/Moda tweet-quote cards */
.twq-wrap{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:40px 0}
.twq{display:block;text-decoration:none;color:inherit;background:var(--card);border:1px solid var(--rule);
  border-radius:16px;padding:16px 18px;box-shadow:0 10px 30px rgba(15,23,41,.06);
  transition:transform .15s ease,box-shadow .15s ease}
.twq:hover{transform:translateY(-2px);box-shadow:0 20px 46px rgba(15,23,41,.11)}
.twq.pos{border-top:3px solid var(--pos)}
.twq.neg{border-top:3px solid var(--neg)}
.twq-h{display:flex;align-items:center;gap:10px}
.twq-tag{margin-left:auto;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.09em;
  text-transform:uppercase;padding:4px 10px;border-radius:999px;flex:none}
.twq.pos .twq-tag{color:var(--pos-ink);background:var(--pos-wash)}
.twq.neg .twq-tag{color:var(--neg-ink);background:var(--neg-wash)}
.twq-txt{display:block;font-size:15px;line-height:1.5;color:var(--ink);margin:13px 0 14px}
.twq-stats{display:flex;gap:22px;border-top:1px solid var(--rule-2);padding-top:12px}
.twq-stats span{font-family:var(--mono);font-size:11.5px;color:var(--mut)}
.twq-stats b{display:block;font-family:var(--disp);font-size:16px;font-weight:800;color:var(--ink);
  letter-spacing:-0.01em;margin-bottom:1px}
/* controversy flywheel */
.flywheel{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:34px 0 8px;
  padding:18px 20px;border-radius:14px;background:var(--neg-wash);border:1px solid rgba(224,103,63,.28)}
.fw-node,.fw-step b{font-family:var(--disp);font-weight:700;font-size:14.5px;color:var(--neg-ink);
  background:var(--card);border:1px solid rgba(224,103,63,.3);border-radius:999px;padding:7px 15px;
  line-height:1.2;white-space:nowrap}
.fw-step{display:inline-flex;align-items:center;gap:10px;white-space:nowrap}
.fw-arr{font-family:var(--disp);font-weight:800;font-size:17px;color:var(--neg);font-style:normal}
.fw-loop{color:var(--gold-ink);font-size:20px}

/* ---------- tables ---------- */
.tbl{overflow-x:auto;border:1px solid var(--rule);border-radius:14px;background:var(--card);margin:44px 0}
table{width:100%;border-collapse:collapse;font-size:15.5px;min-width:520px}
th{text-align:left;font-family:var(--disp);font-size:11.5px;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:var(--mut);background:#f4f7fb;padding:13px 18px;border-bottom:1px solid var(--rule)}
td{padding:14px 18px;border-bottom:1px solid var(--rule-2);vertical-align:top;line-height:1.5}
tr:last-child td{border-bottom:0}
td.good{color:var(--acc-ink);font-weight:600}
td.bad{color:#c0563a;font-weight:600}
td.num{font-family:var(--mono);text-align:right;white-space:nowrap}

/* ---------- FAQ / keep-reading / sources / CTA ---------- */
.faq{background:var(--paper);border-top:1px solid var(--rule);padding:70px 24px 20px}
.faq-in{max-width:66ch;margin:0 auto}
.faq-in > h2{font-size:clamp(26px,3.2vw,36px);margin:0 0 34px;max-width:24ch}
.faq-q{padding:22px 0;border-top:1px solid var(--rule-2)}
.faq-q:first-of-type{border-top:0}
.faq-q h3{font-size:clamp(17px,1.9vw,20px);margin:0 0 10px;max-width:none;line-height:1.3}
.faq-q p{font-size:17px;line-height:1.65;color:var(--body)}

.more{background:var(--card);border-top:1px solid var(--rule);padding:64px 24px}
.more-in{max-width:66ch;margin:0 auto}
.more-k{font-family:var(--mono);font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--acc-ink);margin-bottom:22px}
.more-in ul{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.more-in li{padding:15px 0;border-top:1px solid var(--rule-2)}
.more-in li:first-child{border-top:0}
.more-in a{display:block;font-family:var(--disp);font-weight:600;font-size:17.5px;
  letter-spacing:-0.018em;color:var(--ink);text-decoration:none;line-height:1.3}
.more-in a:hover{color:var(--acc-ink)}
.more-in span{display:block;margin-top:5px;font-size:14.5px;color:var(--mut)}

.pcta{background:var(--deep);color:#fff;padding:70px 24px;position:relative;overflow:hidden}
.pcta::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(80% 90% at 92% 0%,rgba(47,107,255,.26),transparent 60%)}
.pcta-in{max-width:66ch;margin:0 auto;display:flex;gap:28px;align-items:center;
  justify-content:space-between;flex-wrap:wrap;position:relative;z-index:2}
.pcta-k{font-family:var(--mono);font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--volt-2);margin-bottom:12px}
.pcta-in h2{color:#fff;font-size:clamp(24px,3vw,32px);margin:0;max-width:18ch}
.pcta-in p:not(.pcta-k){margin-top:10px;color:var(--deep-mut);font-size:16px;max-width:44ch}
.pcta-btn{flex:none;display:inline-block;background:var(--acc);color:#fff;text-decoration:none;
  font-family:var(--disp);font-weight:700;font-size:16px;letter-spacing:-0.01em;
  padding:15px 26px;border-radius:10px;transition:transform .15s,background .15s}
.pcta-btn:hover{background:var(--acc-ink);transform:translateY(-1px)}

.sources{background:var(--card);border-top:1px solid var(--rule);margin-top:0;padding:66px 24px 92px}
.sources .in{max-width:1100px;margin:0 auto}
.sources h2{font-size:26px;margin:0 0 8px}
.sources .cite-how{font-family:var(--mono);font-size:12.5px;color:var(--mut);background:var(--paper);
  border:1px solid var(--rule);border-radius:10px;padding:16px 18px;margin:0 0 28px;line-height:1.6;max-width:760px}
.sources .cite-how b{color:var(--ink)}
.sources ol{list-style:none;padding:0;margin:0}
.sources li{display:flex;gap:16px;padding:14px 0;border-top:1px solid var(--rule-2);align-items:baseline}
.sources .num{font-family:var(--mono);font-size:12px;color:var(--acc-ink);flex:none;width:26px}
.sources .who2{font-family:var(--disp);font-weight:700;font-size:15.5px;color:var(--ink);flex:none;width:220px}
.sources .ttl{font-size:15px}
.sources .ttl a{color:var(--link);text-decoration:none;border-bottom:1px solid #b9d1fb}

@media (max-width:900px){
  body{font-size:17.5px}
  .interlude .grid{grid-template-columns:1fr}
  .xwrap{grid-template-columns:1fr}
  .ftgrid{grid-template-columns:1fr}
  .twq-wrap{grid-template-columns:1fr}
  .vpair{grid-template-columns:1fr;gap:14px}
  .vp-mid{padding:2px 0}
  .hero .stamp{display:none}
  .sources li{flex-direction:column;gap:4px}
  .sources .who2{width:auto}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important;animation:none!important}}
`;
const CHART_HOOK_STRENGTH = logDots(
  [
    { label: "Strong hook", value: 32119, n: 25, hot: true },
    { label: "Decent hook", value: 345, n: 104 },
    { label: "Weak hook", value: 196, n: 26 }
  ],
  { domainMin: 100, domainMax: 1e5, ticks: [100, 1e3, 1e4, 1e5] }
);
const CHART_HOOK_TYPE = bubbles([
  { label: "Talking head (a face)", value: 976, n: 35, hot: true },
  { label: "Product demo", value: 332, n: 75 },
  { label: "Text card", value: 164, n: 34 }
]);
const CHART_DIFF = dominanceBars(
  [
    { label: "Strongly different", value: 9385, n: 30, hot: true },
    { label: "Somewhat different", value: 1503, n: 64 },
    { label: "Not differentiated", value: 146, n: 61 }
  ],
  { multiple: "\u224864\xD7", sub: "strong vs generic" }
);
const CHART_ORIENTATION = aspectPanels(
  { label: "16:9 landscape", value: 1198, n: 108, hot: true, w: 224, h: 126 },
  { label: "9:16 vertical", value: 107, n: 46, w: 84, h: 150 },
  { multiple: "\u224811\xD7", sub: "landscape vs vertical" }
);
const CHART_PACING = lollipop([
  { label: "Dynamic pacing", value: 6762, n: 57, hot: true },
  { label: "Steady pacing", value: 319, n: 83 },
  { label: "Flat pacing", value: 141, n: 15 }
]);
const CHART_LENGTH = vcolumns([
  { label: "0\u201315s", value: 75, n: 15 },
  { label: "15\u201330s", value: 354, n: 28 },
  { label: "30\u201345s", value: 96, n: 26 },
  { label: "45\u201360s", value: 295, n: 20 },
  { label: "60\u201390s", value: 312, n: 28 },
  { label: "90s+", value: 4396, n: 38, hot: true }
]);
const CHART_DAY = vcolumns([
  { label: "Tue", value: 1765, n: 33, hot: true },
  { label: "Fri", value: 1359, n: 26 },
  { label: "Wed", value: 941, n: 22 },
  { label: "Mon", value: 552, n: 23 },
  { label: "Thu", value: 188, n: 24 },
  { label: "Sat", value: 84, n: 20, dim: true },
  { label: "Sun", value: 49, n: 7, dim: true }
]);
const CHART_COPY = heroSplit(
  { label: "Tweet asks for a reply", value: 237228, n: 18, hot: true },
  { label: "No engagement ask", value: 332, n: 137 },
  { multiple: "\u2248714\xD7", sub: "median views with an explicit ask vs none" }
);
const CHART_LEVERS = rankedMeters(
  [
    { label: "Dynamic pacing", value: 28, display: "+28 pts", hot: true },
    { label: "Surprise density", value: 28, display: "+28 pts", hot: true },
    { label: "Strong hook", value: 23, display: "+23 pts" },
    { label: "High scroll-stop", value: 23, display: "+23 pts" },
    { label: "Distinctive novelty", value: 23, display: "+23 pts" },
    { label: "Strong differentiation", value: 23, display: "+23 pts" },
    { label: "Emotional pull", value: 21, display: "+21 pts" },
    { label: "Rewatchability", value: 15, display: "+15 pts" }
  ],
  { max: 35 }
);
function dtable(cols, rows, hot) {
  const head = cols.map((c, i) => `<th${i ? ' class="num"' : ""}>${c}</th>`).join("");
  const body = rows.map((r) => {
    const cls = hot && r[0] === hot ? ' class="hot"' : "";
    const tds = r.map((cell, i) => `<td${i ? ' class="num"' : ""}>${cell}</td>`).join("");
    return `<tr${cls}>${tds}</tr>`;
  }).join("");
  return `<table class="dtable"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
const TABLE_HOOK_STRENGTH = dtable(
  ["Hook strength", "Median views", "Videos"],
  [["Strong hook", "32,119", "25"], ["Decent hook", "345", "104"], ["Weak hook", "196", "26"]],
  "Strong hook"
);
const TABLE_HOOK_TYPE = dtable(
  ["How it opens", "Median views", "Videos"],
  [["Talking head (a face)", "976", "35"], ["Product demo", "332", "75"], ["Text card", "164", "34"]],
  "Talking head (a face)"
);
const TABLE_DIFF = dtable(
  ["Differentiation", "Median views", "Videos"],
  [["Strongly different", "9,385", "30"], ["Somewhat different", "1,503", "64"], ["Not differentiated", "146", "61"]],
  "Strongly different"
);
const TABLE_LENGTH = dtable(
  ["Length", "Median views", "Videos"],
  [
    ["0&ndash;15s", "75", "15"],
    ["15&ndash;30s", "354", "28"],
    ["30&ndash;45s", "96", "26"],
    ["45&ndash;60s", "295", "20"],
    ["60&ndash;90s", "312", "28"],
    ["90s+", "4,396", "38"]
  ],
  "90s+"
);
const TABLE_ORIENTATION = dtable(
  ["Aspect ratio", "Median views", "Videos"],
  [["16:9 landscape", "1,198", "108"], ["9:16 vertical", "107", "46"]],
  "16:9 landscape"
);
const TABLE_PACING = dtable(
  ["Pacing", "Median views", "Videos"],
  [["Dynamic pacing", "6,762", "57"], ["Steady pacing", "319", "83"], ["Flat pacing", "141", "15"]],
  "Dynamic pacing"
);
const TABLE_DAY = dtable(
  ["Day posted", "Median views", "Videos"],
  [
    ["Tuesday", "1,765", "33"],
    ["Friday", "1,359", "26"],
    ["Wednesday", "941", "22"],
    ["Monday", "552", "23"],
    ["Thursday", "188", "24"],
    ["Saturday", "84", "20"],
    ["Sunday", "49", "7"]
  ],
  "Tuesday"
);
const TABLE_LEVERS = dtable(
  ["Trait", "How much more common in winners"],
  [
    ["Dynamic pacing", "+28 pts"],
    ["Surprise density", "+28 pts"],
    ["Strong hook", "+23 pts"],
    ["High scroll-stop", "+23 pts"],
    ["Distinctive novelty", "+23 pts"],
    ["Strong differentiation", "+23 pts"],
    ["Emotional pull", "+21 pts"],
    ["Rewatchability", "+15 pts"]
  ],
  "Dynamic pacing"
);
const TABLE_COPY = dtable(
  ["Tweet copy", "Median views", "Videos"],
  [["Tweet asks for a reply", "237,228", "18"], ["No engagement ask", "332", "137"]],
  "Tweet asks for a reply"
);
const FT_FACE = [
  ["Moda", "moda", "4.53M", "anvisha", "2036474296353411290"],
  ["Bluma", "bluma", "342K", "_alisawu", "2032191984891543814"],
  ["Volrix", "volrix", "150K", "niraj_munot", "2062783563511247067"],
  ["Sensay", "sensay", "21.7K", "asksensay", "1988990276447154308"],
  ["MAI Agents", "mai-agents", "16.2K", "yuchen__wu", "1973051460217700425"],
  ["Dwight", "dwight", "4,577", "jakebarlo", "2062177232609497302"]
];
const FT_TEXT = [
  ["Slashy", "slashy", "72.9K", "GaddipatiHarsha", "2061830596817805379"],
  ["AutoGTM", "autogtm-sales-agent", "32.1K", "socialwithaayan", "2057797812008677823"],
  ["Rima", "rima-ai", "15.5K", "getrimaai", "2029927021007036830"],
  ["Zerocam", "zerocam", "9,679", "novikoff", "2063391301261758553"],
  ["MyClone", "myclone", "1,950", "viggy28", "1984333859249668424"],
  ["TravDigi", "travdigi", "1,504", "heyrohitai", "2063231585626034344"]
];
function ftCards(list) {
  return list.map(
    ([name, slug, v, sn, id]) => `<a class="ftc" href="https://x.com/${sn}/status/${id}" target="_blank" rel="noopener noreferrer"><span class="ftthumb" style="background-image:url(${VBASE}/ft-${slug}.jpg)"><span class="ftplay"></span></span><span class="ftcap"><b>${name}</b><span class="v">${v}</span></span></a>`
  ).join("");
}
const FACE_TEXT_GRID = `<div class="ftgrid wide">
  <div class="ftcol face"><p class="ftlbl">Opens on a face</p><div class="ftcards">${ftCards(FT_FACE)}</div></div>
  <div class="ftcol text"><p class="ftlbl">Opens on a text card</p><div class="ftcards">${ftCards(FT_TEXT)}</div></div>
</div>`;
const PLAYBOOK_HTML = `<div class="prog"><i id="progbar"></i></div>
<header class="bar" id="bar">
  <span class="mark"><i></i>The Launch Video Index</span>
  <span class="rt">Research &middot; 12 min read</span>
</header>

<section class="hero">
  <video class="hero-vid" autoplay muted loop playsinline preload="auto" poster="https://wdxjduorvpayxixpmskf.supabase.co/storage/v1/object/public/web-assets/launchvids/hero-poster.jpg?v=grid"><source src="https://wdxjduorvpayxixpmskf.supabase.co/storage/v1/object/public/web-assets/launchvids/hero-collage.mp4?v=grid" type="video/mp4"></video>
  <div class="wrap in">
    <div>
      <p class="kicker"><i></i>The Launch Video Index &middot; 2026</p>
      <h1>We studied 194 startup launch videos. The best 20 got <em>82 million</em> views. The worst 20 got 323.</h1>
      <p class="deck">Same platform, same category. The gap between them isn&rsquo;t clarity &mdash; almost all
        of them were perfectly clear. It&rsquo;s something founders keep getting wrong. We hand-verified 194
        genuine startup launches and charted every finding.</p>
      <div class="by">
        <img class="av" src="https://wdxjduorvpayxixpmskf.supabase.co/storage/v1/object/public/web-assets/playbooks/author-river.jpg" alt="River Tamoor Baig" width="42" height="42">
        <address class="who">River Tamoor Baig<span>Founder, Infinite</span></address>
        <span class="stamp">194 verified launches<br>Refreshed 17 August 2026</span>
      </div>
    </div>
  </div>
</section>

<main class="wrap">
  <p class="stand">We scored each video on the craft of the video itself, joined those scores to what the
    posts actually did &mdash; views, likes, bookmarks, replies &mdash; and hand-verified that every one is a
    genuine startup launch, not a big company shipping a feature. <strong>One pattern runs through the whole
    set:</strong> the videos that failed weren&rsquo;t confusing. They were <em>dead</em>.</p>

  <h2><span class="n">00 &middot; The format</span>The launch video is new. The launch is not.</h2>

  <p>The launch video traces back to Steve Jobs, who turned a product spec into an event and made the reveal
    itself the story. But for the two decades after him, that was rare. Most startups launched with a post.
    Founders wrote it &mdash; for Hacker News, for Product Hunt, later for LinkedIn &mdash; and picked over
    every line, maybe with an image or a short blog post attached. Then they spent most of their energy on
    press: chasing journalists, hiring an agency, and judging the day by how much coverage they got.</p>

  <p>That changed in the last two years or so. The launch moved from the post to the <em>video</em>. The
    style grew up in crypto and the NFT era, when a loud, high-production clip was how a project got noticed
    on Twitter. It carried over to AI, and now most teams skip the PR agency altogether. They spend the money
    on the video instead, because the video lets them <strong>tell their own story, their own way</strong>, in
    one thing they control.</p>

  <p>How founders make it varies a lot. Some shoot the whole thing over a weekend on almost no budget. Others
    hire a studio and spend tens, sometimes hundreds, of thousands of dollars. For them the video is how they
    introduce the company to the world: it sets the brand early, builds FOMO with investors, and stakes a
    claim on what they want to be known for. It can bring in users too. But this is where the data gets
    honest: whether a viral launch actually turns into <em>users</em> depends a lot on the product. Not every
    startup benefits the same way, and the numbers here show it.</p>

  <h2><span class="n">Method</span>How we built the Index, and what it can&rsquo;t tell you.</h2>

  <p>We studied <strong>194</strong> real startup launch videos on X, hand-checked so every one is a genuine
    startup launch, not an established company shipping a feature. We scored each on about 20 craft traits,
    hook strength and type, pacing, emotional pull, surprise, rewatchability, aspect ratio, differentiation,
    and more, then matched those scores against how the videos actually performed. The view-ranked findings
    below use the <strong>155 launches old enough to have settled</strong> (30+ days); newer ones count toward
    the study but sit out of the reach comparisons. Every number here is current as of <strong>17 August
    2026</strong>, and each one shows up twice from here on: as a sentence, and as a row in the table under
    its chart, so it&rsquo;s easy to check or quote.</p>

  <p><strong>Read these as patterns, not promises.</strong> We report medians, not means, so a few
    multi-million-view outliers can&rsquo;t drag a number around. And reach has a lot of causes, the audience,
    the timing, the size of the account posting, and plain luck, so treat every finding here as a strong
    correlation, not a guarantee. The one thing this data can&rsquo;t settle: whether emotional pull
    <em>causes</em> reach, or whether the founders who can make a video that hits are simply the ones who
    already have the audience to carry it. Our honest read is that both are true at once.</p>

  <h2><span class="n">01 &middot; The clarity trap</span>Clear is common. Emotion is rare.</h2>

  <p>The easy story is that launches flop because nobody understood the product. The data doesn&rsquo;t back
    that up. <strong>Nearly nine in ten videos were clear.</strong> Clarity is table stakes &mdash; nearly
    everyone clears it, winners and losers alike. What almost nobody had was emotional pull: only <strong>3
    videos in the whole study hit it hard</strong>, and just 42 managed even a medium amount.</p>

  <p>So clarity can&rsquo;t be what separates a 14-million-view launch from a 16-view one, because both were
    clear. The founders who lost weren&rsquo;t fighting a comprehension problem. They were fighting the wrong
    problem.</p>
</main>

<figure class="bleed">
  <div class="tplate">
    <p class="eyebrow">The core finding</p>
    <p class="say">Nearly 9 in 10 were clear. Only <em>3</em> made you feel something.</p>
    <p class="by"><b>Clarity is table stakes; emotion is the variable.</b> Founders optimise the thing that
      almost everyone already gets right, and skip the thing that almost nobody does.</p>
  </div>
</figure>

<main class="wrap">
  <h2><span class="n">02 &middot; The gap</span>82 million views, or 323. Same category.</h2>

  <p>Rank the set by reach and the spread is violent. The twenty most-viewed launch videos have pulled a
    combined <strong>82,616,609 views</strong>. The twenty at the bottom &mdash; same kind of company, same
    kind of product &mdash; have pulled <strong>323, total</strong>. That&rsquo;s about sixteen views each.
    They didn&rsquo;t start slow. They never started.</p>

  <p>One asterisk sits over all of it. The single most-viewed launch film of the period was
    <strong>Orchid</strong>&rsquo;s &mdash; an AI booking an anniversary dinner for a boyfriend who forgot &mdash;
    reported past <strong>32 million views</strong>. It&rsquo;s not in our counts, because Orchid
    <em>deleted it</em> days after launch once the reception turned. This study is about the launches that
    survived; Orchid is what happens when a startup wins the wrong way (more in &sect;10).</p>
</main>

<section class="interlude">
  <div class="in">
    <p class="lbl">The spread</p>
    <h2>The top of this category dwarfs the bottom by five orders of magnitude</h2>
    <p>Both groups are startup launch videos. Both are clear. The difference in outcome isn&rsquo;t
      incremental &mdash; and it&rsquo;s decided by the craft of the first few seconds, not by how well the
      product was explained.</p>
    <div class="grid">
      <div><b>82.6M</b><span>Top 20 &middot; total views</span></div>
      <div><b>323</b><span>Bottom 20 &middot; total views</span></div>
      <div><b><em>~250,000&times;</em></b><span>The gap</span></div>
    </div>
    <p class="caveat">Median-based throughout, not mean &mdash; a handful of multi-million-view outliers would
      make an average lie. Engagement is multi-causal (audience, timing, luck); read these as strong
      correlations, not guarantees.</p>
  </div>
</section>

<main class="wrap">
  <h2><span class="n">03 &middot; The hook</span>The single biggest lever in the set.</h2>

  <p>Of everything we scored, one thing predicted reach better than almost anything else: how strong the
    first few seconds are. Videos with a <strong>strong hook earned about 90&times; the median views</strong>
    of everything else. Not 90%. Ninety times.</p>

  <figure class="chart wide">
    <div class="chart-card">
      <p class="chart-head">Median views by hook strength</p>
      <p class="chart-title">A strong opening was worth ~90&times; a weak one</p>
      ${CHART_HOOK_STRENGTH}
      ${TABLE_HOOK_STRENGTH}
    </div>
    <figcaption><b>Fig. 01.</b> Median views, so the multi-million-view outliers don&rsquo;t distort it. A
      &ldquo;strong&rdquo; hook is the rarest rating (25 of 155) and the most valuable by a distance.</figcaption>
  </figure>

  <p>It&rsquo;s not just how strong the hook is. It&rsquo;s what kind. We labelled how each video opens in its
    first five seconds. <strong>Videos that open on a face beat videos that open on a text card by about
    6&times;</strong>. The most common opening &mdash; a straight product demo &mdash; sat in the middle. Opening
    on a title card, the instinct of a founder who wants to &ldquo;set it up&rdquo; first, was the worst common
    move in the set.</p>

  <figure class="chart wide">
    <div class="chart-card">
      <p class="chart-head">Median views by how the video opens (first 5s)</p>
      <p class="chart-title">Open on a face, not a title card</p>
      ${CHART_HOOK_TYPE}
      ${TABLE_HOOK_TYPE}
    </div>
    <figcaption><b>Fig. 02.</b> A human face in the first frame beat a text-card open ~6&times;. Product demos
      are the default (75 of 155) and only middling &mdash; a demo still has to earn attention. Motion and meme
      opens were too rare (n&le;6) to rank.</figcaption>
  </figure>

  <p>You can see it for yourself. Here are six launches that open on a face, next to six that open on a text
    card, with their views today. Click any one to watch it on X &mdash; the face-opens beat the text-opens at
    every rank down the list:</p>

  ${FACE_TEXT_GRID}

  <p class="ftnote">Across the whole study the median face-open pulled <strong>976</strong> views to a text
    card&rsquo;s <strong>164</strong>, about 6&times;. These twelve are real launches picked as examples; a
    rare text-card open still breaks out, but it&rsquo;s the exception, not the rule.</p>
</main>

<figure class="bleed">
  <div class="tplate">
    <p class="eyebrow">If you change one thing</p>
    <p class="say">A strong hook was worth <em>90&times;</em>. Opening on a face beat a text card <em>6&times;</em>.</p>
    <p class="by"><b>The first two seconds are the whole ballgame.</b> Not the explanation, not the music,
      not the polish. Whether a thumb keeps scrolling.</p>
  </div>
</figure>

<main class="wrap">
  <h2><span class="n">04 &middot; Different beats clear</span>The trait that predicted reach best.</h2>

  <p>If clarity isn&rsquo;t the lever, what is? The strongest single predictor of views in the whole study
    wasn&rsquo;t how clear or how polished a video was &mdash; it was how <em>different</em>. Videos we scored
    as strongly differentiated earned a median <strong>9,385 views; the generic ones, 146</strong>. A
    64&times; gap, on the one thing founders treat as optional.</p>

  <figure class="chart wide">
    <div class="chart-card">
      <p class="chart-head">Median views by differentiation</p>
      <p class="chart-title">Being different was worth ~64&times; being generic</p>
      ${CHART_DIFF}
      ${TABLE_DIFF}
    </div>
    <figcaption><b>Fig. 03.</b> Differentiation out-predicted clarity, polish and even proof. &ldquo;Another
      AI tool for X&rdquo; is the single most expensive framing in the set.</figcaption>
  </figure>

  <h2><span class="n">05 &middot; Length</span>The winners were longer, not shorter.</h2>

  <p>Everyone tells you to cut it to under fifteen seconds. The data says the opposite. The median launch
    video ran <strong>52 seconds</strong>; the shortest clips (under 15s) were the <em>worst</em>-performing
    bucket, and the longest (90s+) had the highest median reach by far. Ranked by views, the <strong>top
    quartile ran a median 56 seconds; the bottom quartile, 37</strong>. The best launches gave themselves
    room to build.</p>

  <figure class="chart wide">
    <div class="chart-card">
      <p class="chart-head">Median views by video length</p>
      <p class="chart-title">Sub-15s clips did worst; the winners ran longer</p>
      ${CHART_LENGTH}
      ${TABLE_LENGTH}
    </div>
    <figcaption><b>Fig. 04.</b> Correlational, not a licence to ramble &mdash; a long video with no emotion
      still dies. But &ldquo;keep it under 15 seconds&rdquo; isn&rsquo;t what the winners did.</figcaption>
  </figure>

  <figure class="breaker">
    <img src="${VBASE}/breaker-1.jpg" alt="Frames from a run of startup launch videos" loading="lazy">
    <figcaption>A few seconds each, from the launches we scored</figcaption>
  </figure>

  <h2><span class="n">06 &middot; The format levers</span>Landscape, and keep it moving.</h2>

  <p>Two production choices moved the numbers more than any amount of polish. First, aspect ratio: the
    &ldquo;shoot everything vertical&rdquo; advice is wrong for launch videos. <strong>16:9 landscape videos
    earned about 11&times; the median views of 9:16 vertical ones</strong> &mdash; a launch film gets watched
    at a desk, quoted in a thread, and embedded in a blog, and landscape wins all three. Second, pacing:
    <strong>dynamic pacing beat flat pacing roughly 20&times;</strong>.</p>

  <figure class="chart wide">
    <div class="chart-card">
      <p class="chart-head">Median views by aspect ratio</p>
      <p class="chart-title">Landscape beat vertical ~11&times; for launch videos</p>
      ${CHART_ORIENTATION}
      ${TABLE_ORIENTATION}
    </div>
    <figcaption><b>Fig. 05.</b> The reverse of the &ldquo;go vertical&rdquo; advice &mdash; and it holds even
      within product-demo videos alone. A launch film is not a TikTok.</figcaption>
  </figure>

  <figure class="chart wide">
    <div class="chart-card">
      <p class="chart-head">Median views by pacing</p>
      <p class="chart-title">Dynamic pacing was worth ~20&times; flat</p>
      ${CHART_PACING}
      ${TABLE_PACING}
    </div>
    <figcaption><b>Fig. 06.</b> Cuts, motion, escalation. A flat, even-paced walkthrough is the fastest way
      to lose the viewer before the payoff.</figcaption>
  </figure>

  <h2><span class="n">07 &middot; Timing</span>Tuesday lunchtime, not the weekend.</h2>

  <p>This is the softest signal here, and the most tangled up with other things &mdash; bigger accounts post
    more deliberately &mdash; but it&rsquo;s real. <strong>Launches posted on a Tuesday had more than 30&times;
    the median reach of ones posted on a Sunday</strong>, and the midday window (about 9am&ndash;3pm US
    Eastern) beat the late afternoon badly. Nights and weekends were where launches went to be ignored.</p>

  <figure class="chart wide">
    <div class="chart-card">
      <p class="chart-head">Median views by day posted</p>
      <p class="chart-title">Weekday launches beat weekends by an order of magnitude</p>
      ${CHART_DAY}
      ${TABLE_DAY}
    </div>
    <figcaption><b>Fig. 07.</b> Timing is confounded by <em>who</em> posts when, so treat it as the weakest
      lever here &mdash; a great video posted on a Sunday still beats a dead one posted on a Tuesday.</figcaption>
  </figure>

  <figure class="breaker">
    <img src="${VBASE}/breaker-2.jpg" alt="More frames from startup launch videos" loading="lazy">
    <figcaption>Different products, the same few seconds that decide it</figcaption>
  </figure>

  <h2><span class="n">08 &middot; What actually separates them</span>Pacing, surprise, difference.</h2>

  <p>Score every video on craft, then split the set into a top and bottom quartile by views, and the same
    handful of traits open up every time. These are the point-gaps: how much more common each trait is among
    the best videos than the worst.</p>

  <figure class="chart wide">
    <div class="chart-card">
      <p class="chart-head">How much more common in the winners than the losers</p>
      <p class="chart-title">The traits that separate a winning launch video from a dead one</p>
      ${CHART_LEVERS}
      ${TABLE_LEVERS}
    </div>
    <figcaption><b>Fig. 08.</b> Dynamic pacing and surprise lead; hook, differentiation and novelty follow.
      <b>Clarity is nowhere on this list</b> &mdash; because both cohorts had it. Two traits founders obsess
      over, &ldquo;native-to-the-feed&rdquo; feel and low advertorial polish, did <em>not</em> separate winners at
      all in the verified data.</figcaption>
  </figure>

  <ul class="lede">
    <li><strong>Being different isn&rsquo;t optional.</strong> Differentiation out-predicted clarity, polish and
      proof. If the one-line pitch is &ldquo;another AI tool for X,&rdquo; the video starts underwater.</li>
    <li><strong>Motion over polish.</strong> Dynamic pacing and surprise were the widest gaps &mdash; escalation
      beats production value.</li>
    <li><strong>Emotion, not clarity.</strong> Only 3 videos in the whole study hit hard emotionally. Even a
      medium amount was worth ~13&times; the flat ones.</li>
  </ul>

  <p>The gap is easier to feel than to read. Here&rsquo;s one of the winners next to one of the dead ones
    &mdash; same category, same month, more than a million times apart. Watch the first three seconds of
    each:</p>

  <figure class="vpair">
    <div class="vp-side win">
      <div class="vp-frame"><video controls preload="none" playsinline poster="${VBASE}/poke.jpg"><source src="${VBASE}/poke.mp4" type="video/mp4"></video><span class="vp-badge">3.21M<em>views</em></span></div>
      <figcaption><b>Poke</b> Instant product motion, a magic-trick open with zero setup. You feel something in the first second.</figcaption>
    </div>
    <div class="vp-mid"><span class="vp-mult">1.6M&times;</span><span class="vp-mlab">more views</span></div>
    <div class="vp-side lose">
      <div class="vp-frame"><video controls preload="none" playsinline poster="${VBASE}/spectc.jpg"><source src="${VBASE}/spectc.mp4" type="video/mp4"></video><span class="vp-badge">2<em>views</em></span></div>
      <figcaption><b>SpectC</b> Clear, competent, inert. Nothing in it makes you feel anything.</figcaption>
    </div>
  </figure>

  <h2><span class="n">09 &middot; The tweet is half the launch</span>The words do as much work as the film.</h2>

  <p>Every finding so far is about the video. But a launch on X is a video <em>and</em> the post it rides in
    on, so we scored the copy too &mdash; and the tweet was doing at least half the work. The loudest pattern:
    <strong>launches whose post made an explicit ask &mdash; &ldquo;reply LAUNCH and I&rsquo;ll send it,&rdquo;
    &ldquo;comment below,&rdquo; &ldquo;repost&rdquo; &mdash; ran three orders of magnitude past the ones that
    posted the film and hoped.</strong></p>

  <figure class="chart wide">
    <div class="chart-card">
      <p class="chart-head">Median views by whether the tweet asks for engagement</p>
      <p class="chart-title">A one-line ask was the single biggest move in the post</p>
      ${CHART_COPY}
      ${TABLE_COPY}
    </div>
    <figcaption><b>Fig. 09.</b> The heaviest confound in the study &mdash; bigger accounts run these plays &mdash;
      so read it as &ldquo;the winners engineered the tweet too,&rdquo; not &ldquo;add a CTA and go viral.&rdquo;
      But the ask is free, and almost no losing video had one.</figcaption>
  </figure>

  <p>The rest of the copy rhymes with the video. A strong opening <em>line</em> &mdash; a clean
    &ldquo;Introducing X, the first &lt;category&gt; that &lt;does the thing&gt;&rdquo; &mdash; beat a vague
    &ldquo;after months of work, excited to finally share&hellip;&rdquo; the same way a strong video hook beat a
    weak one. A specific claim, a named character, one ask. The winners wrote the tweet with the same care as
    the film; the losers treated it as a caption.</p>

  <p>Here&rsquo;s the pattern in the wild &mdash; the exact copy of five winning launch tweets beside five dead
    ones. Same category, wildly different words:</p>

  <div class="tweetvs">
    <div class="tvs-col good">
      <div class="tvs-head"><i>&check;</i>What the winners wrote</div>
      <article class="tw good">
        <header class="tw-h"><img class="tw-av" src="${VBASE}/av-askokara.jpg" alt="" width="40" height="40" loading="lazy"><span class="tw-id"><span class="tw-nm">Okara<i class="tw-ck"></i></span><span class="tw-un">@askOkara</span></span><span class="tw-vm">14.05M<em>views</em></span></header>
        <p class="tw-txt">Today we&rsquo;re <mark>introducing the world&rsquo;s first AI CMO</mark>. Enter your website and it deploys a team of agents to get you traffic. <mark>Try it now.</mark></p>
        <p class="tw-note">Clear intro, then a direct CTA</p>
      </article>
      <article class="tw good">
        <header class="tw-h"><img class="tw-av" src="${VBASE}/av-anvisha.jpg" alt="" width="40" height="40" loading="lazy"><span class="tw-id"><span class="tw-nm">Anvisha<i class="tw-ck"></i></span><span class="tw-un">@anvisha</span></span><span class="tw-vm">4.53M<em>views</em></span></header>
        <p class="tw-txt">We raised $7.5M to kill AI slop. Introducing Moda, the first design agent with taste. <mark>RT + comment &ldquo;Moda&rdquo; and we&rsquo;ll design your brand for free.</mark></p>
        <p class="tw-note">A hook, then an explicit ask</p>
      </article>
      <article class="tw good">
        <header class="tw-h"><img class="tw-av" src="${VBASE}/av-anything.jpg" alt="" width="40" height="40" loading="lazy"><span class="tw-id"><span class="tw-nm">Anything<i class="tw-ck"></i></span><span class="tw-un">@anything</span></span><span class="tw-vm">3.41M<em>views</em></span></header>
        <p class="tw-txt"><mark>Introducing Anything</mark> &mdash; an agent that ships mobile apps &amp; web. Designs that don&rsquo;t look AI-made. <mark>Reply for a week of free credits.</mark></p>
        <p class="tw-note">One-line what-it-is, then an ask</p>
      </article>
      <article class="tw good">
        <header class="tw-h"><img class="tw-av" src="${VBASE}/av-wabi.jpg" alt="" width="40" height="40" loading="lazy"><span class="tw-id"><span class="tw-nm">wabi<i class="tw-ck"></i></span><span class="tw-un">@wabi</span></span><span class="tw-vm">1.15M<em>views</em></span></header>
        <p class="tw-txt">There&rsquo;s an app for you. <mark>Meet Wabi: the first personal software platform.</mark> Generate beautiful, useful little apps.</p>
        <p class="tw-note">A hook, then the category</p>
      </article>
      <article class="tw good">
        <header class="tw-h"><img class="tw-av" src="${VBASE}/av-siron93.jpg" alt="" width="40" height="40" loading="lazy"><span class="tw-id"><span class="tw-nm">Siro<i class="tw-ck"></i></span><span class="tw-un">@Siron93</span></span><span class="tw-vm">144K<em>views</em></span></header>
        <p class="tw-txt">We just launched the fastest way to design mobile apps. <mark>Idea to Figma in under 60 seconds.</mark></p>
        <p class="tw-note">One specific, concrete claim</p>
      </article>
    </div>
    <div class="tvs-col bad">
      <div class="tvs-head"><i>&times;</i>What the dead launches wrote</div>
      <article class="tw bad">
        <header class="tw-h"><img class="tw-av" src="${VBASE}/av-abdou_bouzar1.jpg" alt="" width="40" height="40" loading="lazy"><span class="tw-id"><span class="tw-nm">Abdelouahd Bouzar</span><span class="tw-un">@Abdou_Bouzar1</span></span><span class="tw-vm">71<em>views</em></span></header>
        <p class="tw-txt">Glad to launch AnalyVa. <mark>After months of work, excited to launch</mark> an all-in-one research analysis software.</p>
        <p class="tw-note">The &ldquo;months of work&rdquo; opener</p>
      </article>
      <article class="tw bad">
        <header class="tw-h"><img class="tw-av" src="${VBASE}/av-giress69.jpg" alt="" width="40" height="40" loading="lazy"><span class="tw-id"><span class="tw-nm">Kenn<i class="tw-ck"></i></span><span class="tw-un">@giress69</span></span><span class="tw-vm">21<em>views</em></span></header>
        <p class="tw-txt"><mark>Launch day: FocusFlow Pro is live.</mark> Most productivity apps break focus with setup, so I built one that&rsquo;s voice-first.</p>
        <p class="tw-note">Announces itself, gives no reason to care</p>
      </article>
      <article class="tw bad">
        <header class="tw-h"><img class="tw-av" src="${VBASE}/av-ginja_app.jpg" alt="" width="40" height="40" loading="lazy"><span class="tw-id"><span class="tw-nm">ginja</span><span class="tw-un">@ginja_app</span></span><span class="tw-vm">39<em>views</em></span></header>
        <p class="tw-txt"><mark>We officially launched Ginja on iOS.</mark> Ginja helps you turn messy thoughts into clear, structured tasks.</p>
        <p class="tw-note">&ldquo;Officially launched&rdquo; filler</p>
      </article>
      <article class="tw bad">
        <header class="tw-h"><img class="tw-av" src="${VBASE}/av-brightnet2dark.jpg" alt="" width="40" height="40" loading="lazy"><span class="tw-id"><span class="tw-nm">nothing-to-add</span><span class="tw-un">@brightnet2dark</span></span><span class="tw-vm">45<em>views</em></span></header>
        <p class="tw-txt"><mark>13th Friday is a good time for release.</mark> Just launched my new iOS app, PainPoint: Pain Tracker.</p>
        <p class="tw-note">Opens on nothing</p>
      </article>
      <article class="tw bad">
        <header class="tw-h"><img class="tw-av" src="${VBASE}/av-dinkel_ai_media.jpg" alt="" width="40" height="40" loading="lazy"><span class="tw-id"><span class="tw-nm">DINKEL AI&amp;MEDIA TECH</span><span class="tw-un">@dinkel_ai_media</span></span><span class="tw-vm">43<em>views</em></span></header>
        <p class="tw-txt"><mark>The end of the year is a moment to slow down</mark> and listen. Sonaya is now live on the App Store.</p>
        <p class="tw-note">Meanders before the point</p>
      </article>
    </div>
  </div>

  <h2><span class="n">10 &middot; So what actually works?</span>Two ways to own the timeline &mdash; and they&rsquo;re opposites.</h2>

  <p>Charts tell you which traits correlate with reach. They don&rsquo;t tell you the <em>story</em> a winning
    launch runs. Watch the biggest ones back to back and they sort into two opposite machines &mdash; and
    this is the uncomfortable part, because one of them is built on being disliked.</p>

  <h3>1. The warm cascade &mdash; consensus, pre-positioned</h3>
  <p>The classic play. A founder posts; within about nine minutes the first big reshare fires; within nine
    hours a full cascade has run outward through rings of proof &mdash; investors, then their portfolio
    companies, then power users, then tastemakers, then the teardown accounts who break it down. The
    distribution is <em>lined up in advance</em>: the investors clustered around the founder are a network
    that fires on command, not organic luck. And the thing that spreads is rarely the product &mdash;
    it&rsquo;s a shareable identity piece (a named character or avatar, often with a referral baked in) that
    people post because it says something about <em>them</em>. Speed is the story.</p>

  <h3>2. Controversy-as-distribution &mdash; friction, and the critics amplify</h3>
  <p>The opposite machine. The clearest example is Ollie&rsquo;s &ldquo;AI can now make you a great parent.&rdquo;
    That headline is a referendum, not a description &mdash; you nod or you fight, and both feed the algorithm.
    Ollie launched to friendly VCs first; then the criticism wave &mdash; people who found &ldquo;better than
    any human&rdquo; at parenting offensive &mdash; carried it to <strong>2 million views</strong>. You can read
    the shape in the numbers: <strong>213 quote-tweets and 600 replies against just 2,105 likes</strong> &mdash;
    a launch that made people <em>argue</em>, not applaud. Quote-tweets are how people hand their followers
    something to react to, and here they were a battlefield.</p>

  <div class="twq-wrap wide">
    <a class="twq neg" href="https://x.com/blennon_/status/2061868938443550842" target="_blank" rel="noopener noreferrer">
      <span class="twq-h"><img class="tw-av" src="${VBASE}/av-blennon_.jpg" alt="" width="40" height="40" loading="lazy"><span class="tw-id"><span class="tw-nm">Bill Lennon<i class="tw-ck"></i></span><span class="tw-un">@blennon_ &middot; Ollie</span></span><span class="twq-tag">The provocation</span></span>
      <span class="twq-txt">&ldquo;AI can now make you a great parent.&rdquo; A referendum headline: critics did the amplifying, and carried it to 2M.</span>
      <span class="twq-stats"><span><b>2.05M</b>views</span><span><b>213</b>quotes</span><span><b>600</b>replies</span></span>
    </a>
    <a class="twq pos" href="https://x.com/anvisha/status/2036474296353411290" target="_blank" rel="noopener noreferrer">
      <span class="twq-h"><img class="tw-av" src="${VBASE}/av-anvisha.jpg" alt="" width="40" height="40" loading="lazy"><span class="tw-id"><span class="tw-nm">Anvisha<i class="tw-ck"></i></span><span class="tw-un">@anvisha &middot; Moda</span></span><span class="twq-tag">The payload</span></span>
      <span class="twq-txt">&ldquo;The first design agent with taste.&rdquo; A named product with a clear identity, handed to a warm network. The consensus play.</span>
      <span class="twq-stats"><span><b>4.53M</b>views</span><span><b>1,712</b>reposts</span><span><b>2,532</b>replies</span></span>
    </a>
  </div>

  <div class="flywheel">
    <span class="fw-node">Controversy drives reach</span>
    <span class="fw-step"><i class="fw-arr">&rarr;</i><b>reach drives discourse</b></span>
    <span class="fw-step"><i class="fw-arr">&rarr;</i><b>discourse brings more attention</b></span>
    <span class="fw-step"><i class="fw-arr fw-loop">&#8635;</i><b>and back to the top</b></span>
  </div>

  <p>And none of this was an accident. Ollie knew <em>exactly</em> what that headline would do. They aimed it
    at a belief people hold hard &mdash; how to raise a kid &mdash; and leaned all the way in, betting the
    fight would travel further than any amount of applause. It did: the angrier the quote-tweets got, the more
    the launch spread. They engineered the outrage and rode it on purpose.</p>

  <p>One craft note worth stealing from Ollie: the caption was cold and combative, but the <em>film</em> was
    warm and self-deprecating &mdash; a fake-real cold open, an apology the headline refused to make. The
    provocation bought the reach; the video kept the product from drowning in it. Watch it:</p>

  ${vembed("ollie", { title: "Ollie \u2014 the launch film", meta: "@blennon_ &middot; 2.05M views", tag: "controversy engine" })}

  <h3>3. When the controversy eats the product</h3>
  <p>Which is exactly where Orchid went wrong. Its anniversary film ran the same friction engine &mdash; an AI
    booking a dinner for a boyfriend who forgot &mdash; and out-reached everyone in this study, a reported
    <strong>32M views</strong>. But the reaction was aimed at the premise, not the product; the backlash
    swallowed the story, and the post was pulled within days. Ollie aimed the controversy and survived it.
    Orchid didn&rsquo;t.</p>

  <blockquote class="pull">Go for the strongest reaction you can, but point it at belief in the product, not
    outrage. Ollie did. Orchid got the reach and lost the plot.<cite>The line between the two</cite></blockquote>

  <h2><span class="n">11 &middot; The leaderboard</span>The most-viewed launches of the set</h2>

  <p>The full, sortable Index &mdash; by views, likes, bookmarks and replies &mdash; lives at
    <a class="ref" href="/startup-launch-videos/">the Startup Launch Video Leaderboard</a>. A snapshot of the top of the views ranking,
    refreshed today:</p>

  <p class="note-inline"><b>One caveat on the top row.</b> 1X&rsquo;s NEO film is the most-viewed startup
    launch we have found, by a distance &mdash; but it sits <em>outside</em> the 194-video corpus every
    statistic in this study is computed from, so none of the numbers above move because of it. It is
    also the exception that proves &sect;6: at <b>9 minutes 53 seconds</b> it is more than eleven times
    the 52-second median, and it still did 69 million views. Length is not the lever; being worth
    watching is. A humanoid robot folding laundry in someone&rsquo;s actual kitchen buys attention that
    a 40-second SaaS demo cannot, and almost nobody reading this has that footage available.</p>

  <div class="xwrap wide">
    <a class="xp" href="https://x.com/1x_tech/status/1983233494575952138" target="_blank" rel="noopener noreferrer">
      <span class="xp-thumb vid" style="background-image:url(${VBASE}/neo-1x.jpg)"></span>
      <span class="top"><span class="rank">1</span><span class="who3">1X &mdash; NEO<span>@1x_tech &middot; outside the study corpus</span></span></span>
      <span class="txt">A humanoid robot doing chores in a real home, shot like a product film rather than a demo reel &mdash; and run for nearly ten minutes.</span>
      <span class="stats"><span class="stat"><b>69.19M</b>views</span><span class="stat"><b>68,159</b>likes</span><span class="stat"><b>27,132</b>bookmarks</span></span>
    </a>
    <a class="xp pulled" href="https://www.fastcompany.com/91581882/orchid-ai-assistant-launches-gets-backlash-for-relationship-ad" target="_blank" rel="noopener noreferrer">
      <span class="xp-thumb removed">Post removed</span>
      <span class="top"><span class="rank">2</span><span class="who3">Orchid<span>@orchid_hq &middot; deleted days after launch</span></span></span>
      <span class="txt">An AI booking an anniversary dinner &mdash; then Orchid pulled it once the reception turned. Why it&rsquo;s gone is the whole lesson (&sect;10).</span>
      <span class="stats"><span class="stat"><b>~32M</b>reported views</span><span class="stat"><b>&mdash;</b>post removed</span></span>
    </a>
    <a class="xp" href="https://x.com/askOkara/status/2033562024651968657" target="_blank" rel="noopener noreferrer">
      <span class="xp-thumb vid" style="background-image:url(${VBASE}/okara-ai-cmo.jpg)"></span>
      <span class="top"><span class="rank">3</span><span class="who3">Okara &mdash; AI CMO<span>@askOkara</span></span></span>
      <span class="txt">The most-viewed launch inside the studied corpus &mdash; the AI-CMO reveal.</span>
      <span class="stats"><span class="stat"><b>14.05M</b>views</span><span class="stat"><b>2,357</b>reposts</span><span class="stat"><b>1,602</b>replies</span></span>
    </a>
    <a class="xp" href="https://x.com/reactorworld/status/2060015607928819876" target="_blank" rel="noopener noreferrer">
      <span class="xp-thumb vid" style="background-image:url(${VBASE}/reactor.jpg)"></span>
      <span class="top"><span class="rank">4</span><span class="who3">Reactor<span>@reactorworld</span></span></span>
      <span class="txt">Came out of stealth with a $59M raise &mdash; and the reach to match.</span>
      <span class="stats"><span class="stat"><b>12.74M</b>views</span></span>
    </a>
    <a class="xp" href="https://x.com/slateauto/status/1915591929200340998" target="_blank" rel="noopener noreferrer">
      <span class="xp-thumb vid" style="background-image:url(${VBASE}/slate-auto.jpg)"></span>
      <span class="top"><span class="rank">5</span><span class="who3">Slate Auto<span>@slateauto</span></span></span>
      <span class="txt">A hardware startup reveal that broke out of tech-Twitter.</span>
      <span class="stats"><span class="stat"><b>10.76M</b>views</span></span>
    </a>
    <a class="xp" href="https://x.com/dflieb/status/2005674455474000324" target="_blank" rel="noopener noreferrer">
      <span class="xp-thumb vid" style="background-image:url(${VBASE}/stickerbox.jpg)"></span>
      <span class="top"><span class="rank">6</span><span class="who3">Stickerbox<span>@dflieb</span></span></span>
      <span class="txt">A consumer app launch that far overshot its follower count.</span>
      <span class="stats"><span class="stat"><b>5.49M</b>views</span></span>
    </a>
  </div>

  <p>Or just watch a run of them back to back &mdash; more of the winning set, hosted here. Hit play on any:</p>
  ${filmstrip([
  { slug: "reactor", title: "Reactor", meta: "12.74M views" },
  { slug: "slate-auto", title: "Slate Auto", meta: "10.76M views" },
  { slug: "stickerbox", title: "Stickerbox", meta: "5.49M views" },
  { slug: "moda", title: "Moda", meta: "4.53M views" },
  { slug: "qaf", title: "Qaf", meta: "4.57M views" },
  { slug: "spectre", title: "Spectre", meta: "4.52M views" },
  { slug: "crosspost", title: "Crosspost", meta: "4.49M views" },
  { slug: "anything", title: "Anything", meta: "3.41M views" },
  { slug: "twin", title: "Twin", meta: "3.24M views" },
  { slug: "palmier", title: "Palmier", meta: "2.83M views" },
  { slug: "tau", title: "Tau", meta: "2.65M views" },
  { slug: "nuphos", title: "Nuphos", meta: "2.31M views" },
  { slug: "stanley", title: "Stanley", meta: "2.08M views" }
])}

  <h2><span class="n">12 &middot; The playbook</span>What the data tells you to do</h2>

  <ul class="lede">
    <li><strong>Win the first two seconds.</strong> Open on a face or on the product already moving &mdash; never
      a title card. A strong hook was worth ~90&times; in reach.</li>
    <li><strong>Be different, loudly.</strong> Differentiation out-predicted clarity, polish and proof (~64&times;).
      If the pitch is &ldquo;another AI tool for X,&rdquo; fix that before you film.</li>
    <li><strong>Shoot landscape and keep it moving.</strong> 16:9 beat 9:16 ~11&times;, and dynamic pacing beat
      flat ~20&times;. A launch film is not a TikTok.</li>
    <li><strong>Give it room.</strong> ~30&ndash;60+ seconds beat a rushed sub-15s cut. Flatness is the enemy,
      not length.</li>
    <li><strong>Post into the week, not the weekend.</strong> Weekday midday outperformed &mdash; a small, free
      edge on top of a good video.</li>
    <li><strong>Aim the emotion.</strong> Go for the strongest reaction you can, but point it at belief in the product, not outrage.</li>
  </ul>

</main>

<section class="faq">
  <div class="faq-in">
    <h2>Questions founders actually ask</h2>
    <div class="faq-q">
      <h3>What makes a startup launch video go viral?</h3>
      <p>Not clarity &mdash; nearly every video in our verified 194-video study was clear, winners and losers alike. What separated them was emotional pull: a strong hook, dynamic pacing, surprise, and genuine differentiation. Videos with a strong opening earned roughly 90 times the median views of ones with a weak opening, and strongly differentiated videos beat generic ones about 64 times.</p>
    </div>
    <div class="faq-q">
      <h3>How long should a startup launch video be?</h3>
      <p>Longer than the common advice suggests. The median video in our corpus ran 52 seconds, and clips under 15 seconds were the worst-performing length bucket. Ranked by views, the top quartile ran a median of 56 seconds versus 37 for the bottom. Give the video room to build; flat pacing kills a launch, not length.</p>
    </div>
    <div class="faq-q">
      <h3>How should a launch video open?</h3>
      <p>On a face or on the product already in motion, not on a title card. Videos that opened on a human face outperformed ones that opened on a text card by about 6 times. A straight product demo was the most common open and only middling. The worst common move was setting up the premise with text before anything happens.</p>
    </div>
    <div class="faq-q">
      <h3>Should a startup launch video be vertical or landscape?</h3>
      <p>Landscape, for a launch film. In our data, 16:9 landscape videos earned about 11 times the median views of 9:16 vertical ones, and the effect held even within product-demo videos alone. A launch film gets watched at a desk, quoted in a thread, and embedded in a blog post, and landscape wins all three. Save vertical for TikTok and Reels.</p>
    </div>
    <div class="faq-q">
      <h3>When is the best time to post a launch video on X?</h3>
      <p>Weekday midday. In our corpus, launches posted on a Tuesday had more than thirty times the median reach of ones posted on a Sunday, and the 9am to 3pm US Eastern window beat the late afternoon and evening. Timing is the weakest lever and is confounded by who posts when, so treat it as a small free edge on top of a strong video, not a substitute for one.</p>
    </div>
    <div class="faq-q">
      <h3>Why do most startup launch videos fail?</h3>
      <p>They&#x27;re clear but dead. In the study, the bottom cohort almost entirely lacked emotional pull, surprise and differentiation. A launch video can be perfectly legible and still be completely skippable, and that&#x27;s the default failure, not confusion. Only 3 videos in the whole study hit hard emotionally, while nearly nine in ten were clear.</p>
    </div>
  </div>
</section>

<section class="more">
  <div class="more-in">
    <p class="more-k">Keep reading</p>
    <ul>
      <li><a href="/startup-launch-videos/">The Startup Launch Video Leaderboard</a><span>The full, sortable ranking &mdash; by views, likes, bookmarks and replies.</span></li>
      <li><a href="https://hub.infinite.fast/playbooks/reddit">The founder&rsquo;s guide to Reddit marketing</a><span>Finding your first customers where they already complain.</span></li>
      <li><a href="https://hub.infinite.fast/playbooks">All playbooks</a><span>The rest of the library.</span></li>
    </ul>
  </div>
</section>

<!--PLAYBOOK_CTA_SLOT-->

<section class="sources">
  <div class="in">
    <h2>Sources &amp; method</h2>
    <p class="cite-how"><b>Cite this study:</b> the numbers, tables and charts here are free to quote, embed
      and build on, with credit to Infinite and a link back. Suggested citation: Infinite,
      <em>The Launch Video Index</em> (2026), an analysis of 194 hand-verified startup launch videos on X,
      current as of 17 August 2026. Figures are median-based; view-ranked findings use the 155-video
      mature-engagement subset.</p>
    <ol>
      <li><span class="num">01</span><span class="who2">Infinite <em>(ours)</em></span><span class="ttl">The Launch Video Index &mdash; 194 hand-verified startup launch videos, scored + view-joined.</span></li>
      <li><span class="num">02</span><span class="who2">Public X data</span><span class="ttl">Per-post engagement metrics (views, likes, bookmarks, replies), as of 17 Aug 2026.</span></li>
      <li><span class="num">03</span><span class="who2">Fast Company</span><span class="ttl">Orchid AI assistant launches, gets backlash for relationship ad &middot; <a href="https://www.fastcompany.com/91581882/orchid-ai-assistant-launches-gets-backlash-for-relationship-ad">read</a></span></li>
      <li><span class="num">04</span><span class="who2">Y Combinator</span><span class="ttl">Orchid &mdash; a personal EA in your iMessage &middot; <a href="https://www.ycombinator.com/companies/orchid-ai">profile</a></span></li>
    </ol>
  </div>
</section>`;
const PLAYBOOK_JS = `(function () {
  var bar = document.getElementById("bar");
  var prog = document.getElementById("progbar");
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.width = h > 0 ? (window.scrollY / h) * 100 + "%" : "0%";
    bar.classList.toggle("is-stuck", window.scrollY > window.innerHeight * 0.7);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();`;
const [PLAYBOOK_HTML_HEAD, PLAYBOOK_HTML_TAIL] = PLAYBOOK_HTML.split("<!--PLAYBOOK_CTA_SLOT-->");

export { PLAYBOOK_CSS, PLAYBOOK_HTML, PLAYBOOK_JS };
