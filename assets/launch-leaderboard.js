/**
 * The Startup Launch Video Leaderboard table — ONE renderer, run twice.
 *
 * The build (scripts/build-launch-videos.mjs) loads this file in Node to render the default view
 * (views ranking, page 1, no filter) straight into the HTML, so a crawler or an LLM that never runs
 * JavaScript still reads every ranked startup. The browser then loads the SAME file to re-render the
 * table body when someone sorts, searches or pages, from the row array inlined next to it.
 *
 * That is the whole reason this is a plain script assigning to the global rather than a module:
 * Node can import it for its side effect and read globalThis, the browser can <script src> it, and
 * neither environment gets a second implementation that can drift from the first. If you change how
 * a row renders, both the static HTML and the interactive table change together.
 */
(function (root) {
  "use strict";

  var PAGE = 50;

  var METRIC_COLUMNS = [
    { key: "views", label: "Views" },
    { key: "likes", label: "Likes" },
    { key: "reposts", label: "Reposts" },
    { key: "replies", label: "Replies" },
    { key: "bookmarks", label: "Bookmarks" },
  ];

  var ORCHID = {
    startup: "Orchid",
    handle: "orchid_hq",
    avatar:
      "https://wdxjduorvpayxixpmskf.supabase.co/storage/v1/object/public/web-assets/launchvids/av2-orchid_hq.jpg",
    reportedViews: "~32M",
    url: "https://www.fastcompany.com/91581882/orchid-ai-assistant-launches-gets-backlash-for-relationship-ad",
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmt(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(n >= 10000000 ? 1 : 2) + "M";
    if (n >= 1000) return (n / 1000).toFixed(n >= 100000 ? 0 : 1) + "K";
    return Number(n).toLocaleString("en-US");
  }

  /**
   * Avatar + name + @handle. The logo and the name are REAL dofollow links to the startup's own
   * site when we have one — that backlink is what the leaderboard offers a founder in exchange for
   * submitting, so it must never quietly become nofollow or a redirect.
   */
  function account(name, handle, avatar, site) {
    var href = site || (handle ? "https://x.com/" + encodeURIComponent(handle) : null);
    var av = avatar
      ? '<img class="llb-av" src="' + esc(avatar) + '" alt="" width="38" height="38" loading="lazy">'
      : '<span class="llb-av llb-mono">' + esc(name.charAt(0)) + "</span>";
    var title = site ? "Visit " + name + "’s site" : name + " on X";
    var logo = href
      ? '<a class="llb-avlink" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" title="' +
        esc(title) + '" aria-label="' + esc(title) + '">' + av + "</a>"
      : av;
    var nm = href
      ? '<a class="llb-nmlink" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer"><b>' +
        esc(name) + "</b></a>"
      : "<b>" + esc(name) + "</b>";
    var uh = handle
      ? '<a class="llb-uh" href="https://x.com/' + esc(handle) + '" target="_blank" rel="noopener noreferrer">@' +
        esc(handle) + "</a>"
      : "";
    return '<div class="llb-launch">' + logo + '<span class="llb-who">' + nm + uh + "</span></div>";
  }

  function filterRows(rows, query) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(function (r) {
      if ((r.startup || "").toLowerCase().indexOf(q) !== -1) return true;
      if ((r.startup_handle || "").toLowerCase().indexOf(q) !== -1) return true;
      return (r.founders || []).some(function (f) {
        return (
          (f.name || "").toLowerCase().indexOf(q) !== -1 ||
          (f.handle || "").toLowerCase().indexOf(q) !== -1
        );
      });
    });
  }

  /** The view state resolved into everything both renderers need. Page is CLAMPED, never trusted:
      a filter that shrinks the set below the current page would otherwise render an empty table. */
  function resolve(rows, state) {
    var sortKey = state.sortKey || "views";
    var query = state.query || "";
    var filtered = filterRows(rows, query);
    var sorted = filtered.slice().sort(function (a, b) {
      return (b[sortKey] || 0) - (a[sortKey] || 0);
    });
    var pageCount = Math.max(1, Math.ceil(sorted.length / PAGE));
    var current = Math.min(Math.max(1, state.page || 1), pageCount);
    var start = (current - 1) * PAGE;
    var max = 1;
    for (var i = 0; i < sorted.length; i += 1) max = Math.max(max, sorted[i][sortKey] || 0);
    return {
      sortKey: sortKey,
      query: query,
      sorted: sorted,
      pageCount: pageCount,
      current: current,
      start: start,
      max: max,
      visible: sorted.slice(start, start + PAGE),
      // The pinned row belongs to the unfiltered first page only. It is not part of `sorted`, so it
      // must never shift the rank numbers on any later page.
      showOrchid: !String(query).trim() && current === 1,
    };
  }

  function headHtml(sortKey) {
    return (
      '<tr><th class="llb-rk">#</th><th class="llb-nm">Startup</th><th class="llb-nm2">Founder</th><th class="llb-vid">Video</th>' +
      METRIC_COLUMNS.map(function (c) {
        var on = c.key === sortKey;
        return (
          '<th class="llb-num llb-h' + (on ? " is-on" : "") + '" aria-sort="' +
          (on ? "descending" : "none") + '" scope="col">' +
          // A real <button> inside the <th>: aria-sort belongs on the header and is not valid on
          // role="button", so they cannot share an element — and this is what makes the column
          // operable from the keyboard.
          '<button type="button" class="llb-hbtn" data-sort="' + c.key + '">' + c.label + "</button></th>"
        );
      }).join("") +
      "</tr>"
    );
  }

  function rowHtml(r, rank, sortKey, max) {
    var move =
      sortKey === "views" && r.movement && r.movement !== "same"
        ? '<span class="llb-move llb-move-' + esc(r.movement) + '" aria-hidden="true">' +
          (r.movement === "up" ? "▲" : r.movement === "down" ? "▼" : "•") + "</span>"
        : "";
    var founders = (r.founders || []).length
      ? '<div class="llb-founders">' +
        r.founders.map(function (f) { return account(f.name, f.handle, f.avatar, null); }).join("") +
        "</div>"
      : '<span class="llb-dash">&mdash;</span>';
    var cells = METRIC_COLUMNS.map(function (c) {
      var on = c.key === sortKey;
      var v = r[c.key] || 0;
      var bar = on
        ? '<span class="llb-cellbar" style="width:' + Math.max(2, Math.round((v / max) * 68)) + 'px"></span>'
        : "";
      return '<td class="llb-num' + (on ? " is-on" : "") + '"><span class="llb-v">' + fmt(v) + "</span>" + bar + "</td>";
    }).join("");
    return (
      "<tr>" +
      '<td class="llb-rk"><span class="rkb' + (rank <= 3 ? " rk" + rank : "") + '">' + rank + "</span>" + move + "</td>" +
      '<td class="llb-nm">' + account(r.startup, r.startup_handle, r.startup_avatar, r.startup_url) + "</td>" +
      '<td class="llb-nm2">' + founders + "</td>" +
      '<td class="llb-vid"><a class="llb-vidlink" href="' + esc(r.tweet_url) +
        '" target="_blank" rel="noopener noreferrer" aria-label="Watch ' + esc(r.startup) +
        ' launch on X"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.6"></circle>' +
        '<path d="M10 8.3l6 3.7-6 3.7z" fill="currentColor"></path></svg></a></td>' +
      cells +
      "</tr>"
    );
  }

  function orchidRowHtml(sortKey) {
    var cells = METRIC_COLUMNS.map(function (c) {
      return '<td class="llb-num' + (c.key === sortKey ? " is-on" : "") + '"><span class="llb-v">' +
        (c.key === "views" ? ORCHID.reportedViews : "—") + "</span></td>";
    }).join("");
    return (
      '<tr class="llb-pinned"><td class="llb-rk"><span class="rkb rk1">1</span></td>' +
      '<td class="llb-nm">' + account(ORCHID.startup, ORCHID.handle, ORCHID.avatar, null) + "</td>" +
      '<td class="llb-nm2"><a class="llb-pill" href="' + esc(ORCHID.url) +
        '" target="_blank" rel="noopener noreferrer">Post removed</a></td>' +
      '<td class="llb-vid"><span class="llb-vid-none">&mdash;</span></td>' + cells + "</tr>"
    );
  }

  function bodyHtml(view) {
    var out = view.showOrchid ? orchidRowHtml(view.sortKey) : "";
    for (var i = 0; i < view.visible.length; i += 1) {
      out += rowHtml(view.visible[i], view.start + i + (view.showOrchid ? 2 : 1), view.sortKey, view.max);
    }
    return out;
  }

  /**
   * Windowed pagination, rendered above AND below the table so a reader at the end of a page does
   * not have to scroll back up — the standing complaint with a single bottom "show more".
   */
  function pagerHtml(view, position) {
    if (view.pageCount <= 1) return "";
    var win = [];
    for (var p = 1; p <= view.pageCount; p += 1) {
      if (p === 1 || p === view.pageCount || Math.abs(p - view.current) <= 1) win.push(p);
      else if (win[win.length - 1] !== "gap") win.push("gap");
    }
    var from = view.start + 1;
    var to = Math.min(view.current * PAGE, view.sorted.length);
    var pages = win
      .map(function (p) {
        if (p === "gap") return '<span class="llb-pg-gap" aria-hidden="true">&hellip;</span>';
        return '<button type="button" class="llb-pg' + (p === view.current ? " is-on" : "") +
          '" data-page="' + p + '"' + (p === view.current ? ' aria-current="page"' : "") + ">" + p + "</button>";
      })
      .join("");
    return (
      '<div class="llb-pager llb-pager-' + position + '"><span class="llb-count">' +
      (view.sorted.length ? from + "&ndash;" + to : 0) + " of " + view.sorted.length + "</span>" +
      '<nav class="llb-pages" aria-label="Leaderboard pages">' +
      '<button type="button" class="llb-pg llb-pg-arrow" data-page="' + (view.current - 1) + '"' +
      (view.current === 1 ? " disabled" : "") + ' aria-label="Previous page">&lsaquo;</button>' +
      pages +
      '<button type="button" class="llb-pg llb-pg-arrow" data-page="' + (view.current + 1) + '"' +
      (view.current === view.pageCount ? " disabled" : "") + ' aria-label="Next page">&rsaquo;</button>' +
      "</nav></div>"
    );
  }

  root.LaunchLeaderboard = {
    PAGE: PAGE,
    METRIC_COLUMNS: METRIC_COLUMNS,
    ORCHID: ORCHID,
    esc: esc,
    fmt: fmt,
    resolve: resolve,
    headHtml: headHtml,
    bodyHtml: bodyHtml,
    pagerHtml: pagerHtml,
  };

  // ── Browser only ────────────────────────────────────────────────────────────
  // Everything above is pure and runs in Node at build time. Nothing below does.
  if (typeof document === "undefined") return;

  document.addEventListener("DOMContentLoaded", function () {
    var mount = document.getElementById("llb");
    var dataEl = document.getElementById("llb-data");
    if (!mount || !dataEl) return;

    var rows;
    try {
      rows = JSON.parse(dataEl.textContent);
    } catch (e) {
      // The server-rendered table is already on the page and correct. Leaving it alone is strictly
      // better than replacing it with an error state.
      return;
    }

    var state = { sortKey: "views", query: "", page: 1 };
    var head = mount.querySelector("thead");
    var body = mount.querySelector("tbody");
    var top = mount.querySelector(".llb-pager-top");
    var bottom = mount.querySelector(".llb-pager-bottom");
    var empty = mount.querySelector(".llb-empty");
    var search = mount.querySelector(".llb-search");
    var timer = null;

    function paint() {
      var view = root.LaunchLeaderboard.resolve(rows, state);
      state.page = view.current;
      head.innerHTML = root.LaunchLeaderboard.headHtml(view.sortKey);
      body.innerHTML = root.LaunchLeaderboard.bodyHtml(view);
      var pager = root.LaunchLeaderboard.pagerHtml(view, "top");
      if (top) top.outerHTML = pager || '<div class="llb-pager llb-pager-top"></div>';
      top = mount.querySelector(".llb-pager-top");
      if (bottom) bottom.outerHTML = root.LaunchLeaderboard.pagerHtml(view, "bottom") ||
        '<div class="llb-pager llb-pager-bottom"></div>';
      bottom = mount.querySelector(".llb-pager-bottom");
      if (empty) {
        empty.hidden = view.sorted.length !== 0;
        empty.textContent = "No launches match “" + state.query + "”.";
      }
    }

    mount.addEventListener("click", function (e) {
      var sortBtn = e.target.closest("[data-sort]");
      if (sortBtn) {
        state.sortKey = sortBtn.getAttribute("data-sort");
        state.page = 1;
        paint();
        return;
      }
      var pageBtn = e.target.closest("[data-page]");
      if (pageBtn && !pageBtn.disabled) {
        state.page = Number(pageBtn.getAttribute("data-page"));
        paint();
      }
    });

    if (search) {
      search.addEventListener("input", function () {
        // Debounced so typing does not re-render 190 rows on every keystroke. Page resets on the
        // event, not in a follow-up pass: page 4 of an old result set must never render as an empty
        // page of a new one.
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.query = search.value;
          state.page = 1;
          paint();
        }, 180);
      });
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
