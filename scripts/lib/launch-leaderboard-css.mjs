/**
 * The Startup Launch Video Leaderboard page styles.
 *
 * Lifted verbatim from the Next route this page used to be (1bu-1 src/app/startup-launch-videos),
 * which was deleted when the page moved here. Scoped under .llb-page so it cannot reach the site's
 * other stylesheets; every colour is painted explicitly because the page commits to its own light
 * palette rather than inheriting a theme.
 *
 * The display face resolves to Hanken Grotesk, not Space Grotesk: this site self-hosts the former
 * and its CSP (font-src 'self') forbids fetching the latter, so naming Space Grotesk would have
 * silently rendered the headings in system sans. See launch-video-chrome.mjs.
 */
export const LEADERBOARD_CSS = `
.llb-page{--paper:#f7fbff;--card:#fff;--ink:#101016;--body:#41474f;--mut:#79838f;--rule:#e4e9ee;
  --rule-2:#eef2f6;--deep:#0a0c16;--acc:#00a86b;--acc-ink:#0b7a51;--acc-soft:#e9fbf1;--acc-hover:#128345;
  --gold:#d9a441;--gold-ink:#9a6a10;--volt:#74e3a0;
  --disp:var(--font-disp,"Hanken Grotesk"),-apple-system,"Helvetica Neue",Arial,sans-serif;
  --sans:var(--font-sans,"Hanken Grotesk"),-apple-system,"Helvetica Neue",Arial,sans-serif;
  --mono:var(--font-mono,"JetBrains Mono"),ui-monospace,SFMono-Regular,Menlo,monospace;
  background:var(--paper);color:var(--body);font-family:var(--sans);-webkit-font-smoothing:antialiased;
  min-height:100vh;letter-spacing:-0.004em}
.llb-page *{box-sizing:border-box}
.llb-page h1,.llb-page h2{font-family:var(--disp);color:var(--ink);margin:0;letter-spacing:-0.03em;text-wrap:balance}
.llb-wrap{max-width:1080px;margin:0 auto;padding:0 24px}

/* hero */
.llb-hero{position:relative;background:var(--deep);color:#fff;overflow:hidden}
.llb-hero-vid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.llb-hero::after{content:"";position:absolute;inset:0;z-index:1;
  background:linear-gradient(180deg,rgba(10,12,22,.44),rgba(10,12,22,.72) 66%,rgba(10,12,22,.95)),
  radial-gradient(120% 80% at 84% 0%,rgba(0,168,107,.3),transparent 58%)}
.llb-hero-in{position:relative;z-index:2;padding:70px 24px 54px;text-align:center}
.llb-hero h1{color:#fff;font-weight:700;font-size:clamp(38px,6.4vw,66px);line-height:1;margin:0}
.llb-deck{margin:20px auto 0;max-width:52ch;font-size:clamp(17px,2vw,21px);line-height:1.45;color:rgba(255,255,255,.86);font-weight:500}
.llb-timer{display:inline-flex;align-items:center;gap:8px;margin-top:16px;padding:7px 13px;border:1px solid rgba(255,255,255,.16);
  border-radius:999px;background:rgba(255,255,255,.06);font-family:var(--mono);font-size:11.5px;letter-spacing:.03em;color:rgba(255,255,255,.82)}
.llb-timer-dot{width:7px;height:7px;border-radius:50%;background:var(--volt);box-shadow:0 0 0 0 rgba(74,222,128,.5);animation:llb-pulse 2.4s ease-out infinite}
@keyframes llb-pulse{0%{box-shadow:0 0 0 0 rgba(74,222,128,.45)}70%{box-shadow:0 0 0 7px rgba(74,222,128,0)}100%{box-shadow:0 0 0 0 rgba(74,222,128,0)}}
.llb-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:38px auto 0;max-width:580px}
.llb-stats div{background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.13);border-radius:14px;padding:16px 18px}
.llb-stats b{display:block;font-family:var(--disp);font-weight:700;font-size:clamp(24px,2.7vw,30px);letter-spacing:-0.02em;color:#fff}
.llb-stats div:first-child b{color:var(--volt)}
.llb-stats span{display:block;margin-top:5px;font-family:var(--mono);font-size:10.5px;color:#93a2c4;text-transform:uppercase;letter-spacing:.05em}

/* body */
.llb-body{padding:40px 24px 48px}
/* blog-post / study card */
.llb-studycard{display:flex;align-items:center;gap:18px;text-decoration:none;color:inherit;margin-bottom:18px;
  border:1px solid var(--rule);border-radius:16px;padding:14px 20px 14px 14px;
  background:linear-gradient(100deg,#eefaf3,var(--card) 62%);transition:border-color .12s ease,transform .12s ease}
.llb-studycard:hover{border-color:var(--acc);transform:translateY(-1px)}
.llb-studycard-thumb{width:92px;height:58px;flex:none;border-radius:10px;background-size:cover;
  background-position:center;background-color:#0b0f18}
.llb-studycard-body{display:flex;flex-direction:column;min-width:0;flex:1}
.llb-studycard-k{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--acc-ink)}
.llb-studycard-body b{font-family:var(--disp);font-weight:700;font-size:17px;color:var(--ink);margin-top:3px;letter-spacing:-0.01em}
.llb-studycard-sub{font-size:13px;color:var(--body);margin-top:3px;line-height:1.42}
.llb-studycard-cta{flex:none;font-family:var(--disp);font-weight:700;font-size:14px;color:var(--acc-ink);white-space:nowrap}
@media(max-width:640px){.llb-studycard-cta{display:none}.llb-studycard-thumb{width:64px;height:44px}.llb-studycard-sub{display:none}}
/* One row: submit, search, sort, pages. The search is the only thing that flexes, so the controls
   either side keep their size and the pager stays pinned right until the row genuinely runs out of
   width. */
.llb-bar{display:flex;flex-wrap:nowrap;gap:14px;align-items:center;margin-bottom:16px}
.llb-search{flex:1 1 200px;min-width:160px;font-family:var(--sans);font-size:15px;color:var(--ink);background:var(--card);
  border:1px solid var(--rule);border-radius:12px;padding:12px 16px}
.llb-search::placeholder{color:var(--mut)}
.llb-search:focus{outline:2px solid var(--acc);outline-offset:1px}
.llb-sort{display:flex;align-items:center;gap:9px}
.llb-sort label{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--mut)}
.llb-select{font-family:var(--sans);font-weight:600;font-size:14px;color:var(--ink);background:var(--card);
  border:1px solid var(--rule);border-radius:11px;padding:10px 34px 10px 14px;cursor:pointer;appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%2379838f' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 13px center}
.llb-select:focus{outline:2px solid var(--acc);outline-offset:1px}
/* submit your startup */
.llb-submit{display:inline-flex;align-items:center;gap:7px;font-family:var(--disp);font-weight:700;font-size:14px;
  color:#fff;background:var(--acc);border:0;border-radius:12px;padding:12px 18px;cursor:pointer;white-space:nowrap;
  box-shadow:0 8px 22px rgba(0,168,107,.28);transition:transform .12s ease,background .12s ease}
.llb-submit:hover{background:var(--acc-hover);transform:translateY(-1px)}
.llb-submit:disabled{opacity:.6;cursor:default;transform:none;box-shadow:none}
.llb-submit-plus{font-size:18px;line-height:0;margin-top:-1px}
.llb-modal-bg{position:fixed;inset:0;z-index:100;background:rgba(10,12,22,.5);backdrop-filter:blur(3px);
  display:flex;align-items:center;justify-content:center;padding:20px}
.llb-modal{position:relative;width:100%;max-width:460px;background:var(--card);border:1px solid var(--rule);
  border-radius:20px;padding:30px 30px 28px;box-shadow:0 40px 100px rgba(15,23,41,.28)}
.llb-modal-x{position:absolute;top:12px;right:15px;background:0;border:0;font-size:24px;line-height:1;color:var(--mut);cursor:pointer}
.llb-modal-x:hover{color:var(--ink)}
.llb-modal h3{font-family:var(--disp);font-weight:700;font-size:22px;color:var(--ink);margin:0}
.llb-modal-sub{margin:10px 0 20px;font-size:14.5px;line-height:1.5;color:var(--body)}
.llb-modal-lbl{display:block;font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin:0 0 6px}
.llb-modal-opt{text-transform:none;letter-spacing:0;color:var(--mut)}
.llb-modal-in{width:100%;font-family:var(--sans);font-size:15px;color:var(--ink);background:var(--paper);
  border:1px solid var(--rule);border-radius:11px;padding:12px 14px;margin-bottom:16px}
.llb-modal-in:focus{outline:2px solid var(--acc);outline-offset:1px}
.llb-modal-err{margin:-4px 0 14px;font-size:13px;color:#b8452a;font-weight:500}
.llb-modal-go{width:100%;justify-content:center;margin-top:4px;padding:13px}
.llb-modal-ok{text-align:center;padding:6px 0}
.llb-modal-ok-mark{width:52px;height:52px;margin:0 auto 14px;border-radius:50%;background:var(--acc-soft);
  color:var(--acc-ink);display:grid;place-items:center;font-size:26px;font-weight:800}
.llb-modal-ok p{margin:10px 0 16px;font-size:14.5px;line-height:1.5;color:var(--body)}
.llb-modal-link{display:inline-flex;align-items:center;gap:5px;margin:0 0 20px;font-family:var(--sans);font-size:14px;font-weight:600;
  color:var(--acc-ink);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1.5px;cursor:pointer}
.llb-modal-link:hover{color:var(--ink)}

.llb-scroll{overflow-x:auto;border:1px solid var(--rule);border-radius:18px;background:var(--card);box-shadow:0 14px 40px rgba(15,23,41,.06)}
.llb-table{width:100%;border-collapse:collapse;min-width:880px}
.llb-table thead th{position:sticky;top:0;font-family:var(--mono);font-size:10.5px;text-transform:uppercase;
  letter-spacing:.07em;color:var(--mut);font-weight:600;text-align:right;padding:15px 13px;
  border-bottom:1px solid var(--rule);white-space:nowrap;background:#fbfdfe}
.llb-table th.llb-rk{text-align:center;width:48px}
.llb-table th.llb-nm,.llb-table th.llb-nm2{text-align:left}
/* The header IS the sort control now the select is gone, so every sortable column carries a caret,
   not just the active one. A dimmed caret is what tells a reader the column is clickable at all —
   hover colour alone says nothing on touch. */
.llb-table th.llb-h{white-space:nowrap;padding:0}
.llb-hbtn{font:inherit;color:inherit;background:none;border:0;cursor:pointer;width:100%;
  padding:15px 13px;text-align:right;transition:color .12s;
  /* The font shorthand does not carry these, so a sortable column would otherwise render
     title-case beside the uppercase static ones. */
  text-transform:inherit;letter-spacing:inherit}
.llb-hbtn::after{content:" ▾";color:var(--rule-2);transition:color .12s}
.llb-hbtn:hover{color:var(--ink)}
.llb-hbtn:hover::after{color:var(--mut)}
.llb-hbtn:focus-visible{outline:2px solid var(--acc);outline-offset:-2px;border-radius:6px}
.llb-table th.is-on .llb-hbtn{color:var(--acc-ink)}
.llb-table th.is-on .llb-hbtn::after{color:var(--acc)}
.llb-table td{padding:0 13px;height:62px;border-bottom:1px solid var(--rule-2);font-size:14px;color:var(--body)}
.llb-table tbody tr:last-child td{border-bottom:0}
.llb-table tbody tr{contain:paint}
.llb-table tbody tr:hover{background:#f1fbf6}
.llb-table tbody tr:hover .rkb{border-color:var(--acc)}

.llb-rk{text-align:center;white-space:nowrap}
.llb-move{display:inline-block;margin-left:5px;font-size:9px;line-height:1;vertical-align:middle}
.llb-move-up{color:var(--acc-ink)}
.llb-move-down{color:#b8452a}
.llb-move-new{color:var(--gold-ink)}
.rkb{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9px;
  font-family:var(--mono);font-weight:600;font-size:12.5px;color:var(--mut);background:var(--paper);border:1px solid var(--rule)}
.rkb.rk1{color:#7a5710;background:linear-gradient(180deg,#fdf0cf,#f6e0a4);border-color:#e9cd80}
.rkb.rk2{color:#566172;background:linear-gradient(180deg,#eef1f5,#dde3ea);border-color:#ccd5df}
.rkb.rk3{color:#8a4f2c;background:linear-gradient(180deg,#f8e5d6,#eecbb4);border-color:#e2bda0}

.llb-launch{display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;max-width:162px}
.llb-nmlink{text-decoration:none;color:inherit;min-width:0}
.llb-nmlink:hover b{color:var(--acc-ink)}
.llb-uh{text-decoration:none;color:var(--mut);font-family:var(--mono);font-size:11.5px;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;display:block}
.llb-uh:hover{color:var(--acc-ink)}
.llb-av{width:38px;height:38px;border-radius:50%;flex:none;object-fit:cover;background:var(--rule-2);border:1px solid var(--rule)}
.llb-avlink{display:inline-flex;flex:none;border-radius:50%;transition:box-shadow .12s,transform .12s;cursor:pointer}
.llb-avlink:hover{box-shadow:0 0 0 2px var(--acc);transform:translateY(-1px)}
.llb-avlink:hover .llb-av{border-color:var(--acc)}
.llb-who{display:flex;flex-direction:column;line-height:1.28;min-width:0}
.llb-who b{font-family:var(--disp);font-weight:700;font-size:14.5px;color:var(--ink);letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.llb-who span{font-family:var(--mono);font-size:11.5px;color:var(--mut)}
.llb-launch:hover b{color:var(--acc-ink)}
.llb-mono{font-family:var(--disp);font-weight:700;font-size:15px;color:var(--acc-ink);background:var(--acc-soft);
  border-color:transparent;text-transform:uppercase}
.llb-dash{color:var(--mut);font-family:var(--mono);font-size:15px;padding-left:2px}
.llb-founders{display:flex;flex-direction:column;gap:10px;padding:9px 0}
.llb-founders .llb-launch{min-width:0}
/* pinned #1 (Orchid, post removed) */
.llb-pinned td{background:linear-gradient(180deg,#fffdf6,#fdf4de);border-bottom:1px solid #ecd591}
.llb-pinned:hover td{background:#fdf2d6}
.llb-pill{display:inline-block;font-family:var(--mono);font-size:10px;font-weight:600;text-transform:uppercase;
  letter-spacing:.09em;color:#b8452a;background:rgba(224,103,63,.13);border:1px solid rgba(224,103,63,.25);
  border-radius:999px;padding:5px 11px;white-space:nowrap;text-decoration:none}
.llb-pill:hover{background:rgba(224,103,63,.2)}
.llb-foot{margin:16px 4px 0;font-family:var(--mono);font-size:12px;line-height:1.6;color:var(--mut);max-width:96ch}

.llb-num{text-align:right;font-family:var(--mono);font-variant-numeric:tabular-nums;color:var(--mut);white-space:nowrap;position:relative}
.llb-num .llb-v{position:relative;z-index:1}
.llb-num.is-on{color:var(--ink)}
.llb-num.is-on .llb-v{font-weight:600}
.llb-cellbar{position:absolute;right:18px;bottom:12px;height:4px;border-radius:2px;
  background:linear-gradient(90deg,rgba(0,168,107,.32),var(--acc));min-width:2px}
.llb-empty{padding:28px;text-align:center;font-family:var(--mono);font-size:13px;color:var(--mut)}
/* video column — a link icon to the tweet */
.llb-table th.llb-vid{text-align:center}
.llb-vid{text-align:center;width:50px}
.llb-vidlink{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;
  color:var(--acc);transition:background .12s ease,color .12s ease}
.llb-vidlink:hover{background:var(--acc-soft);color:var(--acc-ink)}
.llb-vid-none{color:var(--mut);font-family:var(--mono);font-size:13px}
/* Numbered pagination, above and below the table. Right-aligned so it sits under the numeric
   columns rather than floating in the middle of a left-aligned table, and so the two copies line up
   with each other down the page. */
.llb-pager{display:flex;align-items:center;justify-content:flex-end;gap:16px;flex-wrap:wrap}
.llb-pager-top{margin:0;flex:none}
/* At the top the row already states the sort and the search, so the range label is the only
   context worth keeping; drop it on narrow screens before the page buttons wrap. */
@media(max-width:1080px){.llb-pager-top .llb-count{display:none}}
.llb-pager-bottom{margin:18px 0 0}
.llb-count{font-family:var(--mono);font-size:11.5px;color:var(--mut)}
.llb-pages{display:flex;align-items:center;gap:4px}
.llb-pg{min-width:32px;height:32px;padding:0 8px;font-family:var(--mono);font-size:12.5px;
  color:var(--ink);background:var(--card);border:1px solid var(--rule);border-radius:8px;
  cursor:pointer;transition:background .15s,border-color .15s,color .15s}
.llb-pg:hover:not(:disabled){border-color:var(--acc);background:var(--acc-soft);color:var(--acc-ink)}
.llb-pg.is-on{background:var(--acc);border-color:var(--acc);color:#fff;font-weight:700}
.llb-pg:disabled{opacity:.35;cursor:default}
.llb-pg-arrow{font-size:16px;line-height:1}
.llb-pg-gap{font-family:var(--mono);font-size:12.5px;color:var(--mut);padding:0 2px}
@media (max-width:560px){.llb-pager{justify-content:space-between}}

/* footer cards */
.llb-grid2{display:grid;grid-template-columns:1.15fr 1fr;gap:18px;margin-top:34px}
.llb-cite,.llb-method{border:1px solid var(--rule);border-radius:18px;padding:26px 28px;background:var(--card)}
.llb-method{display:flex;flex-direction:column}
.llb-cite{background:linear-gradient(180deg,#fff,#f2fbf6)}
.llb-cite-k{font-family:var(--mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.14em;color:var(--acc-ink);margin:0}
.llb-cite-lead{margin:11px 0 0;font-size:15.5px;line-height:1.55;color:var(--ink)}
.llb-cite-lead a{color:var(--acc-ink);font-weight:600}
.llb-endpoints{display:flex;flex-wrap:wrap;gap:11px;margin:20px 0 0}
.llb-endpoints a{display:block;text-decoration:none;background:var(--paper);border:1px solid var(--rule);border-radius:12px;padding:12px 16px;transition:border-color .12s}
.llb-endpoints a:hover{border-color:var(--acc)}
.llb-endpoints b{display:block;font-family:var(--mono);font-size:13.5px;color:var(--acc-ink)}
.llb-endpoints span{display:block;margin-top:2px;font-size:11.5px;color:var(--mut)}
.llb-attr{margin:18px 0 0;font-family:var(--mono);font-size:11.5px;line-height:1.55;color:var(--body);background:var(--paper);border:1px solid var(--rule);border-radius:11px;padding:12px 14px}
.llb-attr span{display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.12em;color:var(--mut);margin-bottom:5px}
.llb-method p:not(.llb-cite-k){margin:11px 0 0;font-size:15px;line-height:1.6;color:var(--body)}
.llb-study{display:block;margin-top:18px;text-decoration:none;font-family:var(--disp);font-weight:700;font-size:15px;color:var(--acc-ink)}
.llb-study span{display:block;margin-top:3px;font-family:var(--sans);font-weight:400;font-size:12.5px;color:var(--mut)}

.llb-benefits{padding:0 24px 56px}
.llb-benefits-in{border:1px solid var(--rule);border-radius:20px;padding:36px 38px;background:linear-gradient(180deg,#fff,#f2fbf6);
  display:grid;grid-template-columns:1fr 1.15fr;gap:38px;align-items:center}
.llb-benefits-copy h2{font-family:var(--disp);font-weight:700;font-size:clamp(22px,2.4vw,28px);letter-spacing:-0.02em;color:var(--ink);margin:10px 0 0}
.llb-benefits-sub{margin:12px 0 20px;font-size:15.5px;line-height:1.55;color:var(--body);max-width:42ch}
.llb-benefits-list{list-style:none;margin:0;padding:0;display:grid;gap:15px}
.llb-benefits-list li{position:relative;padding-left:30px}
.llb-benefits-list li::before{content:"✓";position:absolute;left:0;top:1px;width:20px;height:20px;border-radius:50%;
  background:var(--acc-soft);color:var(--acc-ink);display:grid;place-items:center;font-size:12px;font-weight:800}
.llb-benefits-list b{display:block;font-family:var(--disp);font-weight:700;font-size:15.5px;color:var(--ink)}
.llb-benefits-list span{display:block;margin-top:3px;font-size:14px;line-height:1.5;color:var(--body)}
@media(max-width:820px){.llb-stats{grid-template-columns:repeat(2,1fr)}.llb-grid2{grid-template-columns:1fr}.llb-benefits-in{grid-template-columns:1fr;gap:26px}}
@media(max-width:560px){.llb-hero-in{padding:52px 20px 40px}}`;
