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
    number(value, fallback) {
      const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
      return Number.isFinite(parsed) ? parsed : fallback;
    },
    money(value) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
    },
    decimal(value) {
      return Number.isFinite(value) ? value.toFixed(2) : "n/a";
    },
    percent(value) {
      return Number.isFinite(value) ? `${value.toFixed(1)}%` : "n/a";
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
    "content"(data) {
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
    "leads"(data) {
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
    "snippets"(data) {
      const keyword = helpers.clean(data.primaryKeyword, "AI CMO software");
      const brand = helpers.clean(data.brandName, "Infinite");
      const audience = helpers.clean(data.audience, "founders");
      const benefit = helpers.clean(data.coreBenefit, "turn launch traffic into qualified pipeline");
      const cta = helpers.clean(data.ctaStyle, "Get Infinite");

      return {
        title: `Meta snippets for ${keyword}`,
        lead: `Use these title and description patterns when ${audience} need to understand the page promise quickly.`,
        sections: [
          {
            heading: "Title tag options",
            items: [
              `${keyword} for ${helpers.titleCase(audience)} | ${brand}`,
              `${keyword}: ${benefit} | ${brand}`,
              `${brand} ${keyword} for customer acquisition`,
            ],
          },
          {
            heading: "Meta description options",
            items: [
              `${brand} helps ${audience} ${benefit}. ${cta}.`,
              `Create clearer acquisition pages with ${keyword}, SEO briefs, and landing-page tests from ${brand}. ${cta}.`,
              `${keyword} built for ${audience}. Turn signals into reviewed growth work with ${brand}.`,
            ],
          },
        ],
        nextSteps: [
          "Keep title tags under roughly 60 characters when possible.",
          "Put the primary keyword near the front when it reads naturally.",
          "Connect the snippet to a page that actually answers the search intent.",
        ],
      };
    },
    "product-titles"(data) {
      const productType = helpers.clean(data.productType, "AI growth workspace");
      const brand = helpers.clean(data.brandName, "Infinite");
      const feature = helpers.clean(data.keyFeature, "lead and SEO agents");
      const keyword = helpers.clean(data.primaryKeyword, "AI CMO");
      const audience = helpers.clean(data.audience, "founders");

      return {
        title: `Product title candidates for ${brand}`,
        lead: "Use the keyword-aware options as starting points, then trim for the channel limit that matters.",
        sections: [
          {
            heading: "SEO-led titles",
            items: [
              `${keyword} ${productType} with ${feature}`,
              `${keyword} software for ${audience} | ${brand}`,
              `${brand} ${keyword} ${productType}`,
            ],
          },
          {
            heading: "Benefit-led titles",
            items: [
              `${productType} for ${audience} who need customers`,
              `${brand}: ${feature} for founder-led growth`,
              `${keyword} workspace for leads, SEO, and landing-page tests`,
            ],
          },
        ],
        nextSteps: [
          "Use the shortest title that still preserves the buyer keyword.",
          "Avoid repeating the same keyword twice in one product title.",
          "Pair the chosen title with matching metadata and page copy.",
        ],
      };
    },
    "break-even-roas"(data) {
      const sellingPrice = helpers.number(data.sellingPrice, 84);
      const cogs = helpers.number(data.cogs, 26);
      const shipping = helpers.number(data.shippingCost, 6);
      const feePercent = helpers.number(data.transactionFeePercent, 2.9);
      const returnPercent = helpers.number(data.returnRatePercent, 5);
      const targetProfitPercent = helpers.number(data.desiredProfitMarginPercent, 15);
      const netRevenue = sellingPrice * (1 - returnPercent / 100);
      const fees = sellingPrice * (feePercent / 100);
      const contribution = netRevenue - cogs - shipping - fees;
      const targetProfit = sellingPrice * (targetProfitPercent / 100);
      const targetCac = contribution - targetProfit;
      const breakEvenRoas = contribution > 0 ? sellingPrice / contribution : null;
      const targetRoas = targetCac > 0 ? sellingPrice / targetCac : null;

      return {
        title: "Break-even ROAS model",
        lead: "Use this as the floor before scaling paid acquisition or judging landing-page performance.",
        sections: [
          {
            heading: "Core outputs",
            items: [
              `Contribution margin: ${helpers.money(contribution)} per order.`,
              `Break-even ROAS: ${breakEvenRoas ? `${helpers.decimal(breakEvenRoas)}x` : "no positive margin"}.`,
              `Target ROAS: ${targetRoas ? `${helpers.decimal(targetRoas)}x` : "target margin leaves no allowable CAC"}.`,
            ],
          },
          {
            heading: "Inputs interpreted",
            items: [
              `Net revenue after returns: ${helpers.money(netRevenue)}.`,
              `Payment and platform fees: ${helpers.money(fees)}.`,
              `Target profit per order: ${helpers.money(targetProfit)}.`,
            ],
          },
        ],
        nextSteps: [
          "Fix product economics before buying more traffic if contribution margin is thin.",
          "Use the profit margin calculator as the second mode of the same unit-economics workflow.",
          "Use landing-page tests to improve conversion before raising acquisition spend.",
        ],
      };
    },
    "profit-margin"(data) {
      const sellingPrice = helpers.number(data.sellingPrice, 84);
      const cogs = helpers.number(data.cogs, 26);
      const shipping = helpers.number(data.shippingCost, 6);
      const feePercent = helpers.number(data.transactionFeePercent, 2.9);
      const returnPercent = helpers.number(data.returnRatePercent, 5);
      const monthlyUnits = helpers.number(data.monthlyUnits, 100);
      const adSpend = helpers.number(data.monthlyAdSpend, 2500);
      const netRevenue = sellingPrice * (1 - returnPercent / 100);
      const fees = sellingPrice * (feePercent / 100);
      const profitPerUnit = netRevenue - cogs - shipping - fees;
      const margin = sellingPrice > 0 ? profitPerUnit / sellingPrice * 100 : 0;
      const profitBeforeAds = profitPerUnit * monthlyUnits;
      const profitAfterAds = profitBeforeAds - adSpend;

      return {
        title: "Profit margin model",
        lead: "Connect product margin to ad pressure before deciding whether acquisition is really working.",
        sections: [
          {
            heading: "Margin outputs",
            items: [
              `Profit per unit: ${helpers.money(profitPerUnit)}.`,
              `Gross margin: ${helpers.percent(margin)}.`,
              `Monthly profit after ads: ${helpers.money(profitAfterAds)}.`,
            ],
          },
          {
            heading: "Operating interpretation",
            items: [
              `Monthly profit before ads: ${helpers.money(profitBeforeAds)}.`,
              `Ad spend pressure: ${helpers.money(adSpend)} against ${Math.round(monthlyUnits)} units.`,
              "If margin is weak, pricing, COGS, shipping, returns, or conversion has to improve before scaling.",
            ],
          },
        ],
        nextSteps: [
          "Use the break-even ROAS calculator to turn unit margin into acquisition targets.",
          "Run a landing-page scorecard before blaming the channel.",
          "Track margin changes monthly as pricing and return rates move.",
        ],
      };
    },
    "creative-brief"(data) {
      const product = helpers.clean(data.productName, "Infinite");
      const audience = helpers.clean(data.audience, "founders who need customers");
      const objective = helpers.clean(data.objective, "conversion");
      const message = helpers.clean(data.differentiator, "turns buyer signals into approved growth work");

      return {
        title: `${product} creative brief`,
        lead: "A structured starting brief for ads, UGC, landing-page creative, and campaign tests.",
        sections: [
          {
            heading: "Campaign frame",
            items: [
              `Objective: ${objective}.`,
              `Audience: ${audience}.`,
              `Core message: ${product} ${message}.`,
            ],
          },
          {
            heading: "Deliverables",
            items: [
              "One problem-first static ad.",
              "One workflow-first UGC script.",
              "One landing-page proof block based on the strongest claim.",
            ],
          },
        ],
        nextSteps: [
          "Connect each creative angle to a landing-page test.",
          "Keep claims tied to proof that exists on the page.",
          "Refresh the brief after the first performance read.",
        ],
      };
    },
    "marketing-planner"(data) {
      const business = helpers.clean(data.businessType, "founder-led software");
      const goal = helpers.clean(data.goal, "revenue");
      const horizon = helpers.clean(data.horizon, "90 days");
      const kpi = helpers.clean(data.kpi, "qualified demos");

      return {
        title: `${horizon} marketing planner`,
        lead: `A practical operating plan for ${business}, focused on ${goal.toLowerCase()} and measured by ${kpi}.`,
        sections: [
          {
            heading: "Month 1",
            items: [
              "Clarify positioning and the highest-intent buyer pain.",
              "Publish one search page and one comparison or alternative page.",
              "Collect real lead phrases from communities and competitor discussions.",
            ],
          },
          {
            heading: "Month 2",
            items: [
              "Run one landing-page scorecard and one A/B test.",
              "Repurpose the strongest pain phrases into founder content.",
              `Review ${kpi} weekly and cut work that does not create hand-raisers.`,
            ],
          },
          {
            heading: "Month 3",
            items: [
              "Scale the channel creating the clearest qualified conversations.",
              "Add internal links between the cluster, tools, comparison pages, and homepage.",
              "Refresh CTAs and proof from the latest customer evidence.",
            ],
          },
        ],
        nextSteps: [
          "Use the GTM plan generator for a tighter four-week execution loop.",
          "Use the bottleneck finder before expanding the channel mix.",
          "Keep planning tied to customer acquisition, not activity volume.",
        ],
      };
    },
    "seo-content-roi"(data) {
      const monthlySearches = helpers.number(data.monthlySearches, 1200);
      const pages = helpers.number(data.pages, 24);
      const ctr = helpers.number(data.ctrPercent, 6) / 100;
      const visitorToLead = helpers.number(data.visitorToLeadPercent, 2.5) / 100;
      const leadToCustomer = helpers.number(data.leadToCustomerPercent, 12) / 100;
      const annualValue = helpers.number(data.annualValue, 2400);
      const costPerPage = helpers.number(data.costPerPage, 180);
      const visits = monthlySearches * pages * ctr;
      const leads = visits * visitorToLead;
      const customers = leads * leadToCustomer;
      const monthlyRevenue = customers * annualValue / 12;
      const cost = pages * costPerPage;
      const payback = monthlyRevenue > 0 ? cost / monthlyRevenue : null;

      return {
        title: "SEO content ROI model",
        lead: "Use this directional model before committing to a search cluster.",
        sections: [
          {
            heading: "Estimated return",
            items: [
              `Monthly visits: ${Math.round(visits).toLocaleString("en-US")}.`,
              `Monthly leads: ${helpers.decimal(leads)}.`,
              `Estimated payback: ${payback ? `${helpers.decimal(payback)} months` : "no payback yet"}.`,
            ],
          },
          {
            heading: "Program economics",
            items: [
              `Program cost: ${helpers.money(cost)} for ${Math.round(pages)} pages.`,
              `Monthly revenue estimate: ${helpers.money(monthlyRevenue)}.`,
              "If the model only works with aggressive conversion assumptions, target higher-intent pages first.",
            ],
          },
        ],
        nextSteps: [
          "Build the content cluster before writing one-off posts.",
          "Use SEO + GEO briefs for pages with clear buyer intent.",
          "Add internal links from related tools and comparison pages.",
        ],
      };
    },
    "competitor-alternative"(data) {
      const competitor = helpers.clean(data.competitor, "a growth agency");
      const product = helpers.clean(data.product, "Infinite");
      const audience = helpers.clean(data.audience, "founders");
      const pain = helpers.clean(data.pain, "slow execution and unclear acquisition priorities");

      return {
        title: `${product} vs ${competitor} brief`,
        lead: "Build the alternative page around buyer doubts, proof, and the moment the current option stops working.",
        sections: [
          {
            heading: "Page angle",
            items: [
              `${audience} compare alternatives when they feel ${pain}.`,
              `Position ${product} around visible acquisition work, not vague automation.`,
              "Open with the switching moment before listing features.",
            ],
          },
          {
            heading: "Sections to include",
            items: [
              "Speed to execution and founder approval flow.",
              "Lead discovery, SEO/GEO output, landing-page testing, and content planning.",
              "FAQ answers on cost, replacement risk, limitations, and what humans still approve.",
            ],
          },
        ],
        nextSteps: [
          "Source every competitor claim from public pages.",
          "Link to the SEO + GEO brief generator for the final page brief.",
          "Use the content cluster generator to build supporting pages.",
        ],
      };
    },
    "landing-scorecard"(data) {
      const product = helpers.clean(data.product, "Infinite");
      const headline = helpers.clean(data.headline, "AI CMO for founders");
      const audience = helpers.clean(data.audience, "founders");
      const proof = helpers.clean(data.proof, "workflow screenshots and customer examples");
      const cta = helpers.clean(data.cta, "Get Infinite");
      const words = headline.split(/\s+/).filter(Boolean).length;
      const hasAudience = headline.toLowerCase().includes(audience.toLowerCase().split(" ")[0]);
      const hasActionCta = /start|get|try|book|join|create|download/i.test(cta);

      return {
        title: `${product} landing page scorecard`,
        lead: "A fast conversion pass for the hero, proof, CTA, and first next step.",
        sections: [
          {
            heading: "Scorecard",
            items: [
              `Headline length: ${words} words. ${words <= 9 ? "Good for fast scanning." : "Consider trimming it."}`,
              `Audience clarity: ${hasAudience ? "audience appears in the hero." : `add ${audience} to the hero or subhead.`}`,
              `CTA strength: ${hasActionCta ? "direct action CTA." : "CTA could be more action-oriented."}`,
            ],
          },
          {
            heading: "Recommended fixes",
            items: [
              `Place ${proof} before the second CTA so visitors do not have to trust the claim cold.`,
              `Test "${cta}" against an outcome-led CTA.`,
              "Move the most concrete workflow or proof artifact above the fold.",
            ],
          },
        ],
        nextSteps: [
          "Turn the weakest scorecard item into an A/B test.",
          "Use one primary test at a time.",
          "Connect the winning message to SEO, content, and comparison pages.",
        ],
      };
    },
    "content-cluster"(data) {
      const topic = helpers.clean(data.topic, "AI CMO");
      const audience = helpers.clean(data.audience, "founders");
      const product = helpers.clean(data.product, "Infinite");

      return {
        title: `${helpers.titleCase(topic)} content cluster`,
        lead: `A cluster for ${audience} that connects search pages, AI-answer questions, and founder-led content back to ${product}.`,
        sections: [
          {
            heading: "Search pages",
            items: [
              `${helpers.titleCase(topic)} for ${helpers.titleCase(audience)}.`,
              `Best ${topic} tools.`,
              `${helpers.titleCase(topic)} alternatives and comparisons.`,
            ],
          },
          {
            heading: "AI-answer questions",
            items: [
              `What does a ${topic} do?`,
              `When should ${audience} use a ${topic}?`,
              `How much does a ${topic} cost compared with agencies or hiring?`,
            ],
          },
          {
            heading: "Founder content",
            items: [
              `${audience} do not have a building problem; they have a distribution operating problem.`,
              `Show one ${product} output and the acquisition decision it unlocks.`,
              "Teardown a weak landing page or search result and show the practical fix.",
            ],
          },
        ],
        nextSteps: [
          "Estimate the upside with the SEO ROI calculator.",
          "Create briefs for the highest-intent pages first.",
          "Plan internal links before publishing the cluster.",
        ],
      };
    },
    "acquisition-bottleneck"(data) {
      const business = helpers.clean(data.business, "founder-led SaaS");
      const traffic = helpers.number(data.traffic, 1200);
      const leads = helpers.number(data.leads, 24);
      const customers = helpers.number(data.customers, 3);
      const contentPieces = helpers.number(data.contentPieces, 4);
      const leadRate = traffic > 0 ? leads / traffic * 100 : 0;
      const closeRate = leads > 0 ? customers / leads * 100 : 0;
      const bottlenecks = [];
      if (traffic < 1000) bottlenecks.push("Traffic bottleneck: publish search pages, comparison pages, and founder content before over-optimizing conversion.");
      if (leadRate < 2) bottlenecks.push("Conversion bottleneck: tighten the hero, CTA, proof, and lead magnet.");
      if (closeRate < 10) bottlenecks.push("Offer or follow-up bottleneck: review qualification, pricing clarity, and whether leads match the ICP.");
      if (contentPieces < 8) bottlenecks.push("Content velocity bottleneck: increase the surface area of useful pages and posts.");
      if (!bottlenecks.length) bottlenecks.push("Scale bottleneck: the basics are working. Add more high-intent sources and repeat the workflow weekly.");

      return {
        title: `${helpers.titleCase(business)} acquisition diagnosis`,
        lead: "Find the constraint that should be fixed before adding more channels or tactics.",
        sections: [
          {
            heading: "Current rates",
            items: [
              `Visitor-to-lead rate: ${helpers.percent(leadRate)}.`,
              `Lead-to-customer rate: ${helpers.percent(closeRate)}.`,
              `Content shipped this month: ${Math.round(contentPieces)} pages or posts.`,
            ],
          },
          {
            heading: "Likely bottleneck",
            items: bottlenecks,
          },
        ],
        nextSteps: [
          "Use the lead finder if traffic is too low.",
          "Use the landing scorecard if conversion is too low.",
          "Use the GTM planner to turn the diagnosis into a weekly loop.",
        ],
      };
    },
    "internal-linking-map"(data) {
      const pillar = helpers.clean(data.pillar, "AI CMO");
      const moneyPage = helpers.clean(data.moneyPage, "Infinite homepage");
      const pages = helpers.clean(data.pages, "AI CMO for founders, best AI CMO tools, AI CMO alternatives, SEO content ROI calculator")
        .split(/,|\n/)
        .map((page) => page.trim())
        .filter(Boolean)
        .slice(0, 8);

      return {
        title: `${helpers.titleCase(pillar)} internal linking map`,
        lead: "Use this to make each page pass relevance toward the page that converts.",
        sections: [
          {
            heading: "Hub and spokes",
            items: [
              `${helpers.titleCase(pillar)} hub links to every supporting page and points the highest-intent CTA to ${moneyPage}.`,
              ...pages.map((page, index) => `${page}: link back to the hub, forward to ${moneyPage}, and sideways to ${pages[(index + 1) % pages.length] || "a related tool"}.`),
            ],
          },
          {
            heading: "Anchor text",
            items: [
              `Use descriptive anchors like "${pillar} for founders" and "${pillar} alternatives".`,
              "Avoid vague anchors like learn more when a specific topic anchor is available.",
            ],
          },
        ],
        nextSteps: [
          "Add links when each page is published, not weeks later.",
          "Keep the tools hub connected to the cluster.",
          "Refresh links after adding comparison or alternative pages.",
        ],
      };
    },
    "linkedin-bio"(data) {
      const name = helpers.clean(data.name, "Founder");
      const product = helpers.clean(data.product, "Infinite");
      const audience = helpers.clean(data.audience, "founders");
      const outcome = helpers.clean(data.outcome, "get customers");
      const proof = helpers.clean(data.proof, "building in public");

      return {
        title: `${name} LinkedIn bio options`,
        lead: "Use the direct version first, then test sharper positioning once people understand the offer.",
        sections: [
          {
            heading: "Bio options",
            items: [
              `${name} builds ${product} to help ${audience} ${outcome}. Sharing lessons from ${proof}.`,
              `${audience} do not need more dashboards. They need a repeatable way to ${outcome}. Building ${product}.`,
              `Building ${product}. Using ${proof} to show how ${audience} can ${outcome} without hiring a full marketing team.`,
            ],
          },
          {
            heading: "Profile copy",
            items: [
              `${product} | Helping ${audience} ${outcome}.`,
              `Featured link: see how ${product} turns growth signals into customer acquisition work.`,
            ],
          },
        ],
        nextSteps: [
          "Keep the profile claim aligned with current landing-page copy.",
          "Use the founder content generator for posts that support the same promise.",
          "Refresh the bio when the ICP or product proof changes.",
        ],
      };
    },
    "gtm-plan"(data) {
      const product = helpers.clean(data.product, "Infinite");
      const audience = helpers.clean(data.audience, "founders");
      const goal = helpers.clean(data.goal, "first 20 customers");
      const channel = helpers.clean(data.channel, "SEO, Reddit, X, and landing-page tests");

      return {
        title: `${product} go-to-market plan`,
        lead: `A focused four-week plan for reaching ${goal} with ${channel}.`,
        sections: [
          {
            heading: "Week 1",
            items: [
              `Define the ICP triggers for ${audience}.`,
              "Collect 30 high-intent pains from communities, competitors, reviews, and launch posts.",
              "Publish one comparison or alternative page.",
            ],
          },
          {
            heading: "Weeks 2-4",
            items: [
              "Ship one SEO/GEO page, one landing-page test, and direct replies to the highest-intent conversations.",
              "Double down on the channel with the clearest hand-raisers.",
              "Turn the winning message into a weekly loop: scan, brief, publish, reply, measure, refresh.",
            ],
          },
        ],
        nextSteps: [
          "Use the acquisition bottleneck finder before expanding the channel mix.",
          "Use the marketing planner template for a broader 30/60/90-day view.",
          "Track qualified conversations, page visits, lead captures, demos, and customers.",
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
