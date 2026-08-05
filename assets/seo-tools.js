(function (global) {
  const doc = global.document;

  const helpers = {
    titleCase(value) {
      return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
    },
    clean(value, fallback) {
      const text = String(value || "").trim().replace(/\s+/g, " ");
      return text || fallback;
    },
    lower(value, fallback) {
      return helpers.clean(value, fallback).toLowerCase();
    },
  };

  const generators = {
    "landing-tests"(data) {
      const product = helpers.clean(data.product, "your app");
      const audience = helpers.clean(data.audience, "founders");
      const cta = helpers.clean(data.cta, "Start free trial");
      const goal = helpers.lower(data.goal, "increase qualified signups from existing traffic");

      return {
        title: `A/B test ideas for ${product}`,
        lead: `Use these tests when the goal is to ${goal} without changing the whole page at once.`,
        sections: [
          {
            heading: "Highest-priority test",
            items: [
              `Control: keep the current hero and ${cta} CTA so the baseline is clean.`,
              `Variant: rewrite the hero for ${audience} around the concrete conversion job: ${goal}.`,
              "Decision rule: ship the variant only if qualified clicks or completed forms improve, not just bounce rate.",
            ],
          },
          {
            heading: "Message variants to queue",
            items: [
              `Problem-first: name the stalled outcome ${audience} already feel before introducing ${product}.`,
              `Workflow-first: show the before, action, and after that happens once someone chooses ${cta}.`,
              "Proof-first: move one credible screenshot, metric, or product artifact above the fold if you have it.",
            ],
          },
          {
            heading: "Next instrumentation",
            items: [
              `Track CTA clicks on "${cta}", form starts, completed conversions, and scroll depth around the first proof block.`,
              "Run one primary test at a time so a winning result explains what changed.",
            ],
          },
        ],
        nextSteps: [
          "Write the control and variant hypotheses before editing the page.",
          "Keep the test live long enough to avoid one-day traffic noise.",
          "Use Infinite to turn the winning message into follow-up pages, posts, and comparison angles.",
        ],
      };
    },
    "seo-geo"(data) {
      const topic = helpers.clean(data.topic, "AI growth agents");
      const product = helpers.clean(data.product, "Infinite");
      const buyer = helpers.clean(data.buyer, "technical founders");
      const differentiator = helpers.lower(data.differentiator, "combines lead discovery, SEO, content, and conversion work in one founder-reviewed loop");

      return {
        title: `${helpers.titleCase(topic)} brief`,
        lead: `Build this page for ${buyer} researching "${topic}" in search engines and AI answer tools.`,
        sections: [
          {
            heading: "Search intent",
            items: [
              `Primary query: ${topic}.`,
              `Buyer frame: ${buyer} need a clear explanation, alternatives, limitations, and the reason ${product} is relevant.`,
              `Differentiator to support with product evidence: ${differentiator}.`,
            ],
          },
          {
            heading: "Recommended page structure",
            items: [
              `Define ${topic} in the opening section using plain buyer language.`,
              `Explain when ${product} is a fit and when a narrower specialist tool or agency is a better fit.`,
              "Add a comparison table only where you can source each claim from public docs, product pages, or your own product UI.",
              "Include concise answers to the exact questions a founder would ask an AI assistant before buying.",
            ],
          },
          {
            heading: "Evidence and internal links",
            items: [
              "Cite official product docs, public pricing pages, changelogs, or first-party screenshots where available.",
              "Link from the tools hub, the relevant comparison page, and one blog post that expands the topic.",
              `End with a practical next step for ${buyer}, not a generic newsletter pitch.`,
            ],
          },
        ],
        nextSteps: [
          "Collect source URLs before drafting claims.",
          "Write the FAQ answers in 40-80 words each so crawlers and readers can extract them.",
          "Use Infinite to keep the page updated as positioning, competitors, and buyer questions change.",
        ],
      };
    },
    content(data) {
      const product = helpers.clean(data.product, "Infinite");
      const audience = helpers.lower(data.audience, "indie hackers");
      const channel = helpers.clean(data.channel, "X");
      const insight = helpers.lower(data.insight, "they can ship products faster than they can create demand");

      return {
        title: `Founder content ideas for ${product}`,
        lead: `These ${channel} angles turn a real market insight into posts ${audience} can recognize quickly.`,
        sections: [
          {
            heading: "Post angles",
            items: [
              `Contrarian lesson: ${audience} do not need more random tactics if the real issue is that ${insight}.`,
              `Workflow teardown: show one messy manual process and how ${product} changes the next action.`,
              `Before/after: rewrite a weak positioning line into a sharper version for ${audience}.`,
              `Open question: ask ${audience} where they lose the most time between building, launching, and finding customers.`,
              `Mini-case: describe a realistic scenario where ${product} turns one signal into a landing page, reply, or content brief.`,
            ],
          },
          {
            heading: "Format guidance",
            items: [
              `${channel} works best when the hook names the pain before the product.`,
              "Use one specific screenshot, prompt, customer quote, or anonymized workflow artifact when you have it.",
              "Do not imply customer results unless you can show the evidence.",
            ],
          },
        ],
        nextSteps: [
          "Pick one idea and write three hooks before drafting the full post.",
          "Save comments and replies as future lead or SEO signals.",
          "Use Infinite to connect winning post angles to pages, outreach, and follow-up tests.",
        ],
      };
    },
    leads(data) {
      const product = helpers.clean(data.product, "your product");
      const icp = helpers.lower(data.icp, "founders who launched but need customers");
      const category = helpers.lower(data.category, "growth software");
      const pain = helpers.lower(data.pain, "the buyer is actively describing a problem your product can solve");

      return {
        title: `Lead finder template for ${product}`,
        lead: `Use this search pattern to find ${icp} already showing pain, urgency, and category fit.`,
        sections: [
          {
            heading: "Intent phrases",
            items: [
              `"looking for alternatives to ${category}"`,
              `"how do I fix ${pain}"`,
              `"what are you using for ${category}"`,
              `"launched but no customers" plus language that matches ${icp}`,
            ],
          },
          {
            heading: "Qualification filters",
            items: [
              `Keep posts where ${icp} describe the problem in their own words.`,
              `Prioritize threads with recent activity, budget pressure, or failed attempts to solve ${pain}.`,
              "Deprioritize homework questions, agency prospecting, vague idea validation, and posts with no next-step urgency.",
            ],
          },
          {
            heading: "Reply angle",
            items: [
              `Open with the specific pain you noticed, not a pitch for ${product}.`,
              `Reference the source context, explain the next practical step, then mention how ${product} can help if relevant.`,
              "Save the best phrases as future SEO, landing-page, and content inputs.",
            ],
          },
        ],
        nextSteps: [
          "Run the search across Reddit, X, founder communities, launch comments, and competitor discussions.",
          "Score each lead on pain, fit, timing, and source credibility before replying.",
          "Use Infinite to turn repeated lead phrases into pages, posts, and reviewed outreach drafts.",
        ],
      };
    },
  };

  function render(output, result) {
    output.innerHTML = [
      `<h2>${escapeHtml(result.title)}</h2>`,
      `<p>${escapeHtml(result.lead)}</p>`,
      '<div class="seo-output-sections">',
      ...result.sections.map(
        (section) => [
          '<section class="seo-output-section">',
          `<h3>${escapeHtml(section.heading)}</h3>`,
          '<ul class="seo-output-list">',
          ...section.items.map((item) => `<li><span>${escapeHtml(item)}</span></li>`),
          "</ul>",
          "</section>",
        ].join(""),
      ),
      "</div>",
      '<div class="seo-result-cta">',
      "<h3>Turn this into an operating loop.</h3>",
      "<p>Infinite helps founders turn signals into reviewed pages, content, outreach, and conversion tests without claiming the work shipped itself.</p>",
      '<a class="seo-button" href="/download">Get Infinite</a>',
      "</div>",
    ].join("");
  }

  function toPlainText(result) {
    const lines = [result.title, "", result.lead, ""];

    result.sections.forEach((section) => {
      lines.push(section.heading);
      section.items.forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    });

    if (result.nextSteps?.length) {
      lines.push("Practical next steps");
      result.nextSteps.forEach((item) => lines.push(`- ${item}`));
    }

    return lines.join("\n").trim();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function track(eventName, properties) {
    try {
      if (typeof global.posthog?.capture === "function") {
        global.posthog.capture(eventName, properties);
      }
      if (typeof global.gtag === "function") {
        global.gtag("event", eventName, properties);
      }
      if (Array.isArray(global.dataLayer)) {
        global.dataLayer.push({ event: eventName, ...properties });
      }
    } catch (_) {
      // Analytics must never block the tool interaction.
    }
  }

  function setStatus(status, message) {
    if (status) status.textContent = message;
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = doc.createElement("a");
    link.href = url;
    link.download = filename;
    doc.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  global.InfiniteSeoTools = { generators, helpers, render, toPlainText };

  if (!doc) return;

  const forms = doc.querySelectorAll("[data-generator]");

  forms.forEach((form) => {
    const generator = generators[form.dataset.generator];
    const output = doc.querySelector(form.dataset.output || "#generator-output");
    const status = doc.querySelector(form.dataset.status || "[data-tool-status]");
    const copyButton = form.querySelector("[data-copy-result]");
    const downloadButton = form.querySelector("[data-download-result]");
    const toolName = form.dataset.toolName || form.dataset.generator;
    let started = false;
    let lastResult = null;
    let lastText = "";

    if (!generator || !output) return;

    const markStarted = () => {
      if (started) return;
      started = true;
      track("tool_started", { tool_name: toolName });
    };

    const run = (shouldTrack) => {
      const formData = new FormData(form);
      lastResult = generator(Object.fromEntries(formData.entries()));
      lastText = toPlainText(lastResult);
      render(output, lastResult);
      setStatus(status, "Result updated. Copy or download it when ready.");

      if (shouldTrack) {
        track("tool_generated", { tool_name: toolName });
      }
    };

    form.addEventListener("focusin", markStarted);
    form.addEventListener("input", markStarted);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      markStarted();
      run(true);
    });

    copyButton?.addEventListener("click", async () => {
      markStarted();
      if (!lastText) run(false);
      try {
        await navigator.clipboard.writeText(lastText);
        setStatus(status, "Result copied to clipboard.");
        track("result_copied", { tool_name: toolName });
      } catch (_) {
        setStatus(status, "Copy unavailable in this browser. Select the result text to copy it.");
      }
    });

    downloadButton?.addEventListener("click", () => {
      markStarted();
      if (!lastText) run(false);
      downloadText(`${toolName}-result.txt`, lastText);
      setStatus(status, "Result downloaded as a text file.");
      track("download_clicked", { tool_name: toolName });
    });

    run(false);
  });
})(window);
