/**
 * "Submit your startup" — the one-field modal on the leaderboard.
 *
 * Posts to the app's public submission endpoint through a same-origin rewrite. That request is the
 * ONLY thing this static page needs a server for: the page itself is built ahead of time, so there
 * is nothing here to render on demand. The endpoint inserts a PENDING row —
 * nothing reaches the leaderboard until an admin approves it, which is what keeps this cheap and
 * spam-tolerant.
 *
 * Markup and class names match the styles lifted with the page, so the modal is styled by the same
 * CSS the React version used.
 */
(function () {
  "use strict";

  // SAME-ORIGIN on purpose. The page's CSP is connect-src 'self', and the API route emits no CORS
  // headers, so a direct cross-origin POST is blocked twice over — silently, at the preflight, with
  // nothing in the UI to explain it. vercel.json rewrites this path to the API.
  var ENDPOINT = "/api/launch-videos/submit";
  var overlay = null;

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (e.key === "Escape") close();
  }

  function formHtml() {
    return (
      '<form class="llb-modal-form">' +
      "<h3>Submit your launch vid</h3>" +
      '<label class="llb-modal-lbl" for="llb-tweet">Launch post link</label>' +
      '<input id="llb-tweet" class="llb-modal-in" placeholder="https://x.com/you/status/1234567890" required>' +
      '<label class="llb-modal-lbl" for="llb-email">Email <span class="llb-modal-opt">(we&rsquo;ll ping you when it&rsquo;s live)</span></label>' +
      '<input id="llb-email" class="llb-modal-in" type="email" placeholder="you@startup.com" required>' +
      '<p class="llb-modal-err" hidden></p>' +
      '<button type="submit" class="llb-submit llb-modal-go">Submit &rarr;</button>' +
      "</form>"
    );
  }

  function okHtml(message) {
    var d = document.createElement("div");
    d.textContent = message || "Submitted!";
    return (
      '<div class="llb-modal-ok"><div class="llb-modal-ok-mark">&#10003;</div>' +
      "<h3>You&rsquo;re in the queue</h3><p>" + d.innerHTML + "</p>" +
      '<a class="llb-modal-link" href="https://x.com/riverkhan" target="_blank" rel="noopener noreferrer">Follow @riverkhan on X <span aria-hidden="true">&#8599;</span></a>' +
      '<button type="button" class="llb-submit llb-modal-go" data-close>Done</button></div>'
    );
  }

  function open() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "llb-modal-bg";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML =
      '<div class="llb-modal"><button type="button" class="llb-modal-x" aria-label="Close" data-close>&times;</button>' +
      formHtml() + "</div>";
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKey);

    var card = overlay.querySelector(".llb-modal");
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target.closest("[data-close]")) close();
    });
    card.addEventListener("submit", function (e) {
      e.preventDefault();
      send(card);
    });
    var first = overlay.querySelector("#llb-tweet");
    if (first) first.focus();
  }

  function send(card) {
    var url = card.querySelector("#llb-tweet");
    var email = card.querySelector("#llb-email");
    var err = card.querySelector(".llb-modal-err");
    var go = card.querySelector(".llb-modal-go");
    if (!url || !email || !go) return;

    go.disabled = true;
    go.textContent = "Submitting…";
    if (err) err.hidden = true;

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tweet_url: url.value, email: email.value }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (r) {
        if (r.ok && r.data && r.data.ok) {
          card.innerHTML =
            '<button type="button" class="llb-modal-x" aria-label="Close" data-close>&times;</button>' +
            okHtml(r.data.message);
          return;
        }
        fail(card, (r.data && r.data.error) || "Something went wrong. Please try again.");
      })
      .catch(function () {
        fail(card, "Network error. Please try again.");
      });
  }

  function fail(card, message) {
    var err = card.querySelector(".llb-modal-err");
    var go = card.querySelector(".llb-modal-go");
    if (err) {
      err.textContent = message;
      err.hidden = false;
    }
    if (go) {
      go.disabled = false;
      go.textContent = "Submit →";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-submit]")) open();
    });
  });
})();
