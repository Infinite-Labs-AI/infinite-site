(function () {
  const forms = document.querySelectorAll("[data-generator]");

  const helpers = {
    titleCase(value) {
      return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
    },
    clean(value, fallback) {
      const text = String(value || "").trim();
      return text || fallback;
    },
  };

  const generators = {
    "landing-tests"(data) {
      const product = helpers.clean(data.product, "your app");
      const audience = helpers.clean(data.audience, "founders");
      const cta = helpers.clean(data.cta, "Start free trial");

      return {
        title: `A/B test ideas for ${product}`,
        lead: `Start with message clarity, then test proof and CTA intent for ${audience}.`,
        items: [
          {
            title: "Variant A: Problem-first hero",
            body: `Lead with the pain: "${audience} can build fast, but customers still take work." Keep ${cta} as the main action.`,
          },
          {
            title: "Variant B: Outcome-first hero",
            body: `Lead with the payoff: "Turn launch traffic into a customer pipeline." Add one proof block before the first CTA.`,
          },
          {
            title: "Variant C: Workflow-first hero",
            body: `Show the exact loop: signal found, page drafted, test queued. Use ${cta} after the workflow preview.`,
          },
        ],
      };
    },
    "seo-geo"(data) {
      const topic = helpers.clean(data.topic, "AI growth agents");
      const product = helpers.clean(data.product, "Infinite");
      const buyer = helpers.clean(data.buyer, "technical founders");

      return {
        title: `${helpers.titleCase(topic)} brief`,
        lead: `A GEO-ready page should answer the exact comparison questions ${buyer} ask in Google, ChatGPT, Claude, and Perplexity.`,
        items: [
          {
            title: "Page angle",
            body: `${product} for ${buyer}: how it finds leads, prepares SEO/GEO work, tests landing pages, and surfaces content ideas.`,
          },
          {
            title: "Questions to answer",
            body: `What is ${topic}? Who is it for? How does it compare to hiring a marketer? What tools does it connect to?`,
          },
          {
            title: "Internal links to add",
            body: "Link from the homepage hero, pricing FAQ, comparison hub, and every relevant free tool page.",
          },
        ],
      };
    },
    content(data) {
      const product = helpers.clean(data.product, "Infinite");
      const audience = helpers.clean(data.audience, "indie hackers");
      const channel = helpers.clean(data.channel, "X");

      return {
        title: `5 content ideas for ${product}`,
        lead: `Treat this like a message from the growth agent: here are the angles worth trying on ${channel}.`,
        items: [
          {
            title: "The build-to-distribution gap",
            body: `Show how ${audience} can ship in a weekend but still struggle to make strangers care.`,
          },
          {
            title: "One signal, one move",
            body: "Take a real buyer pain thread and show the landing page, reply, or SEO page it should create.",
          },
          {
            title: "Founder workflow teardown",
            body: `Compare manual growth work with the ${product} loop: monitor, prepare, approve, ship.`,
          },
          {
            title: "Competitor pattern remix",
            body: "Find a post format already getting traction, then adapt the structure to your own market.",
          },
          {
            title: "Before and after",
            body: "Show a weak homepage message, the test Infinite would run, and the metric that decides the winner.",
          },
        ],
      };
    },
    leads(data) {
      const product = helpers.clean(data.product, "your product");
      const icp = helpers.clean(data.icp, "founders who launched but need customers");
      const category = helpers.clean(data.category, "growth software");

      return {
        title: `Lead finder template for ${product}`,
        lead: `Use this to find high-intent conversations from people who are already describing the problem.`,
        items: [
          {
            title: "Intent phrases",
            body: `"looking for alternatives to ${category}", "launched but no customers", "how do I get users for my app"`,
          },
          {
            title: "ICP filters",
            body: `Keep threads from ${icp}. Deprioritize students, agencies selling services, and vague "what should I build" posts.`,
          },
          {
            title: "Sources to scan",
            body: "Reddit, X, founder communities, competitor comments, G2 reviews, launch posts, and comparison pages.",
          },
          {
            title: "Reply angle",
            body: `Lead with the pain you noticed, attach the source context, then show how ${product} solves the next step.`,
          },
        ],
      };
    },
  };

  function render(output, result) {
    output.innerHTML = [
      `<h2>${escapeHtml(result.title)}</h2>`,
      `<p>${escapeHtml(result.lead)}</p>`,
      '<ul class="seo-output-list">',
      ...result.items.map((item) => `<li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.body)}</span></li>`),
      "</ul>",
    ].join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  forms.forEach((form) => {
    const generator = generators[form.dataset.generator];
    const output = document.querySelector(form.dataset.output || "#generator-output");
    if (!generator || !output) return;

    const run = () => {
      const formData = new FormData(form);
      render(output, generator(Object.fromEntries(formData.entries())));
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      run();
    });

    run();
  });
})();
