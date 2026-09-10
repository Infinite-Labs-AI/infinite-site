# Infinite — shared capability workspace

The four-card capabilities layout was committed as `57a7f73` before this experiment. The saved source and URL remain unchanged.

This separate page preserves the accepted hero and dashboard while replacing the repeated capability-card structure with a shared work surface. Four different artifacts occupy a loose, staggered layout: a buyer note, an open search answer, a content sheet and a test specimen. Titles are 24–26px and descriptions 16px. The concise capability descriptions remain unchanged.

Each artifact responds to hover, keyboard focus or tap: reveal a reply angle, expand a sample answer, change the content format, or switch the landing-page hypothesis. These are illustrative examples, not live scans, search rankings, generated content, tests or traffic splitting. The comparison link returns to the committed card design.

No new images, dependencies, production edits or publishing. Review this layout before further site expansion. This experiment is intentionally uncommitted.

## Grouping refinement

The user loved the workspace but found the associations unclear. Each station now starts with its number, title and description, immediately followed by its own artifact. A faint top rule distinguishes the four areas without introducing enclosing cards. The staggered shared canvas remains. Verified all four hover interactions and reset behavior, heading-first DOM order, 16px mobile descriptions and no horizontal overflow at desktop or 390px. All local assets and JavaScript syntax pass. The four-card checkpoint 57a7f73 remains unchanged.

## Founder proof

Added two founder quotes verbatim from the existing homepage (edyme and Harsh Savergaonkar), retaining existing portraits and profile/original-post links. No new endorsements or results were invented. Three clearly labeled future case-study placements follow. Quotes use 22px desktop/20px mobile text. Desktop rendering and portrait loading verified; IDs and local asset paths pass. The preview server was restarted on port 4321.

### Founder globe study
The two existing, unedited founder quotes now open from standing avatar characters. Hover, keyboard focus, or tap switches the single speech bubble; hover gives a small wave. No automatic cycling, continuous rendering, map SDK, or third-party requests. Reduced motion removes transitions. Placement on the globe is illustrative, not author geolocation.

`assets/founder-globe.svg` is a ~39KB local static orthographic dotted map, generated from the public-domain Natural Earth 1:110m land geometry: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson. The land is geographically projected; people are editorially placed. `proof.js` supplies the small selection interaction. Existing case-study placeholders remain below.

### Gravity-ring revision
Replaced the globe with a locally drawn SVG orbital station. Faces now sit inside upright name chips on the ring. Drag horizontally or focus the station and press arrow keys to rotate; hover/focus a founder opens their existing quote. Slow automatic rotation pauses while interacting, offscreen, and when the page is hidden. The explicit pause/play control and system reduced-motion preference control automatic movement. No external assets or rendering library added.

### Solar system selected, enlarged
`solar.html` now uses a 1200px desktop scene (up from 850px) and larger ships. Founders drift on independent smooth paths across the system instead of following orbit tracks. Local separation keeps the two chips readable when their paths meet. Motion continues when the pointer is in empty space, pauses over a quote/ship or with keyboard focus, and respects reduced motion, visibility, and manual pause. Dragging still scrubs the flight paths.

### Solar illustration refinement
Eight planets with local SVG shading, ring detail, Earth-like land shapes, a moon, and sparse asteroid marks. Planet groups move on slow elliptical paths at different rates using the existing visibility-aware motion loop. Ships reduced exactly 50%: 110→55px desktop, 76→38px mobile; face chips retain readable size. Checked eight planet nodes, changing orbital transforms, desktop/mobile widths, and single-quote selection.
Visual references explored: https://www.rawpixel.com/image/19102911/minimalist-solar-system-illustration and https://designbylj.com/shop/space-map-print (thin orbital paths and varied planet treatment). All rendered artwork remains original code-native SVG; no reference imagery embedded.

### Customer stories section
The selected solar page now continues into `#stories`: one featured lead-discovery story plus two supporting search/content stories. Original CSS paper artwork, large typography, and native expandable outlines. Customer names, quotes, and outcomes remain explicitly unfilled; decorative art is illustrative. No fabricated proof. Desktop/mobile layout checked, three stories present, expansion works, no horizontal overflow at 390px. Styling in `stories.css`; no extra JavaScript or image requests.

### Modern customer-results revision
Inspected https://www.gomega.ai/ (featured results carousel) and https://www.gomega.ai/customers (photo/result split panels), plus its HVAC detail page. Replaced decorative paper story cards with a large photo-led feature, result-first typography, three accessible story selectors, supporting metric slots, and a native dialog preview. Names and numerical outcomes are unfilled; stock photo is explicitly illustrative. Image source: https://images.unsplash.com/photo-1497366811353-6870744d04b2 (local resized copy). No Mega copy, customer metrics, or photography reused. Verified tab switching, arrow-key selection, modal open/close, local photo load, and mobile without horizontal overflow.

### How it works
Added `#how-it-works` after customer stories on solar.html. Three manually selected steps with one illustrative preview: product context, choosing a starting task, and reviewing/approving prepared work. Approval wording follows the current site's existing description of Infinite preparing work for user approval. No production onboarding changed. Tested click and vertical arrow-key navigation, single visible panel, and mobile stacking without overflow. Files: getting-started.css / getting-started.js.

### How it works — three concepts, one review switcher
The rejected numbered-tabs-plus-fake-form layout is gone. `#how-it-works` now holds three
deliberately incompatible concepts behind a dashed review-only switcher; each takes the same
section slot and has a durable URL. Files: `how-it-works.css` / `how-it-works.js`. The previous
`getting-started.css` / `.js` remain on disk, unreferenced, if the old version is wanted back.

- `?how=workbench` — **The workbench.** One continuous line-drawn bench (your desk → Infinite's
  bench → back to you) with a single job card you physically drag along a range rail. As it
  travels it picks things up: a buying-signal slip clips on, then a draft; the lamp lights over
  the middle bench, the tools lift, and a rubber stamp lands "YOUR CALL" at the end. Three step
  captions sit under the stage and double as jump-to-stop buttons.
- `?how=sentence` — **One sentence.** No panels, no cards, no heading: the section *is* one
  66-character sentence at up to 66px with three phrases marked by a hand-drawn squiggle. Hover,
  tap or tab a phrase and a leader line draws itself from the word down to a small paper artifact
  (context card / fanned prepared work / your approve-reject pair). The leader bows out around the
  type instead of crossing it when the phrase is not on the last line.
- `?how=strip` — **✳ the companion.** Three comic beats starring the asterisk from the wordmark,
  given eyes and arms. "You" stay off-panel and appear as a card sliding in and a pen that ticks.
  Hover / focus / tap plays that panel's beat (card slides, stack fans with sparkles, pen ticks and
  the check draws). Bubbles alternate between your voice (white) and its voice (lilac).

Copy is honest throughout: context in, signals found and work prepared, you approve. No setup-time
claims, no invented metrics, nothing sent, no accounts connected. Every concept carries an
"illustrative preview" footnote.

Verified in-browser at 1440px and at a ~485px viewport: all three concepts, switcher clicks,
`ArrowLeft`/`ArrowRight` roving tabindex, `?how=` and `#how-<name>` deep links (both rewrite the
URL to a shareable `?how=…#how-it-works`), the bench rail via drag and via the step buttons with
`aria-valuetext` announcing the step, the sentence leader line re-measuring after a resize or a
concept switch, the strip beats on hover and on tap, no horizontal overflow, no console errors,
and no clipped artwork. No animation loops: everything is event-driven apart from one bounded
intro tween that nudges the job card once when the bench first scrolls into view, skipped under
`prefers-reduced-motion`, which also disables every transition in the section.

### Three more concepts — six options total
The first three are unchanged and keep their names and links (`?how=workbench`, `?how=sentence`,
`?how=strip`). Three more were added beside them in the same switcher, each a different premise
rather than a restyle of an existing one.

- `?how=stack` — **The morning stack.** The only concept where the visitor performs the product's
  actual gesture. A deck of three prepared items sits centred; you press "Looks good" or "Not this
  one" and the card flies off to reveal the next, with a counter and a "why this" footer on each.
  An end card closes it ("That's the stack") with a "Run it again" reset. Interaction is
  decide-and-dismiss — nothing else on the page asks the reader to make a call.
- `?how=nightshift` — **Late shift.** One room, two states, a switch. "You're out" is a dark indigo
  night: moon and stars in the window, a lit lamp, work piling on the desk. "You're back" turns the
  same room to morning light — lamp off, papers squared with a tag on top, a mug, a warm glow
  through the window. Solid filled shapes, no outlines, and the only dark moment on an otherwise
  pale page. The caption swaps with the state.
- `?how=zoom` — **Find the one.** The same picture at three depths. Level 0 is a field of ~175 tiny
  chatter marks with a faint ring somewhere in it; level 1 resolves into a handful of posts with one
  of them crisp; level 2 is a single readable conversation with the prepared reply beside it and a
  "waiting on your ok" chip. Click the picture to go deeper (it cycles back out at the end) or jump
  with the Everywhere / Nearby / The one stepper. Layers cross-fade and scale rather than one world
  being scaled 9×, so nothing is ever blurry or authored at a fake size.

Verified after the addition: all six `?how=` links and `#how-<name>` anchors, six-stop
`ArrowLeft`/`ArrowRight`/`Home` roving tabindex, exactly one panel visible at a time, the original
three still working (bench rail to the end with all three slips readable, sentence leader line
re-measuring, three strip beats), the stack run through to its end card and reset, the late-shift
switch in both directions with `aria-checked`, all three zoom levels by stepper and by clicking the
picture, no horizontal overflow at 1500px or at a ~485px viewport, no console errors, and the
approved sections above (`#dashboard`, `#capabilities`, `#proof`, `#stories`) untouched. Still no
animation loops: the only keyframe animation is the companion's blink, which runs on hover.
The typeface preference is left on Space Grotesk, as chosen.

One bug fixed in concept 01 while verifying: `your-next-big-thing.com` could wrap to two lines at
some widths, which pushed the fanned draft to within 11px of the stage top. The card is wider now
and the URL no longer wraps.

### Reference study, then three new formats (07–09)
All six earlier concepts were rejected. Before building again I read how the reference sites
actually construct this section — rendering each page and reading its DOM rather than guessing
from a screenshot of the fold. Saaspo itself is behind Cloudflare bot protection and was not
accessible, so the same class of sites was sampled directly (Clay, Attio, Tella, Warp; Gamma and
Lovable also blocked).

What they do:
- **Twin** — component named `HowItWorksSection`. Three big panels, each holding a real UI fragment
  with named things (a picker listing Lead Scout / Outreach Operator / Operations Agent / Briefing
  Analyst / Marketing Producer; app icons; a card reading "Scheduled — Lead Scout · Weekdays at
  8AM"). The number and title are a small caption *under* each panel. Personality is in the
  backdrop; credibility is in the foreground UI.
- **Ryze** — "See what Ryze does inside your account": a checklist of six specific fixes, each with
  an impact figure and an Apply / Applied button, three applied and three waiting, cursor on an
  Apply. Plus an ad card showing ROAS 4.5x | CPA $8 with Stop ✕ / Scale ✓.
- **Gomega** — "Watch Mega work. One brief. Four agents. Always shipping." A command bar, a stream
  of completed work, then outcome numbers.
- **Unfair** — no how-it-works at all; a self-case-study with receipts, and the mechanism as one
  line: "You rent the reach. You keep the list."
- **Roommaster, Clay, Attio, Tella, Warp** — no process section either; sequenced capability blocks,
  each a headline, one line, and a real product visual.

The diagnosis: none of them explains a process with a metaphor. Every one shows the actual work
product, itemised, with specific nouns and numbers. All six earlier concepts were metaphors — a
bench, a sentence, a mascot, a card stack, a night room, a zoom — and showed nothing Infinite makes.

The three new ones keep that lesson (itemised, specific, honest) but do not copy any reference's
shape:

- `?how=board` — **The arrivals board.** A dark split-flap status board. Rows are real arriving work
  with times and sources; the three statuses — FOUND, DRAFTED, WAITING FOR YOU — *are* the three
  steps, defined in a key beneath. "Advance the board" flips every row one stage with a staggered
  roll; tapping a row opens what it actually wrote. The only dark object on the page.
- `?how=daily` — **The Infinite Daily.** A newspaper front page whose stories are the work it did.
  The process is carried by the paper's own furniture: the byline says who filed it and when, the
  dateline says NOTHING SENT, and "read why this ran" opens the reason it was chosen. Sign off the
  edition and a stamp lands.
- `?how=receipt` — **The receipt.** An itemised till receipt with torn edges: what it found, what it
  drafted, then ON YOUR DESK 4 THINGS / SENT WITHOUT ASKING 0 / DECISIONS LEFT TO YOU ALL OF THEM /
  TOTAL YOUR MORNING BACK. "Print it again" replays the staggered print; "Sign it" draws a signature.

The switcher now carries nine options with the new three first and `?how=board` as the default;
every earlier name and deep link still works. Verified: all nine `?how=` routes and `#how-<name>`
anchors, nine-stop arrow/Home tabindex, one panel visible at a time, no console errors, Space
Grotesk preserved, and the approved sections untouched. Mobile was checked with a local iframe
harness at 430px (the browser window would no longer resize below the display minimum); the harness
was deleted afterwards. Still no animation loops.

### Cut back to three
Six concepts were deleted on request: 01 the workbench, 05 late shift, 06 find the one, 07 the
arrivals board, 08 the Infinite Daily, 09 the receipt. Three remain, unchanged and keeping their
original numbers and slugs so they can still be referred to the same way:

- `?how=sentence` — 02 · One sentence (now the default)
- `?how=strip` — 03 · ✳ the companion
- `?how=stack` — 04 · The morning stack

Their markup, styles and behaviour are untouched; only the deleted concepts' panels, chips, CSS
blocks and handlers were removed, along with the workbench's measure/place wiring and its one-shot
intro tween. `how-it-works.css` went from 34.8KB to 12.5KB and `how-it-works.js` from 12.0KB to
6.1KB, with no dead `.wb-` / `.ls-` / `.zm-` / `.bd-` / `.dl-` / `.rc-` rules left. Verified: three
routes and anchors, three-stop arrow/Home/End tabindex, one panel visible at a time, the sentence
leader line, the strip beats, the stack run through to its end card and reset, no console errors,
Space Grotesk preserved, approved sections untouched. A copy of the nine-concept version is kept
outside the repo in the session scratchpad (`solar.9concepts.bak` and matching css/js) if any of the
deleted six is ever wanted back.

### 10 and 11, added and then cut
Two more were built and rejected: `?how=pr` (the pull request — the week arriving as a code review
with per-file Approve/Skip) and `?how=xray` (one drawn app window with a seam you drag across it to
show the working behind each row). Both were reverted; `solar.html`, `how-it-works.css` and
`how-it-works.js` are byte-for-byte back to the three-concept state (54,982 / 12,524 / 6,132 bytes)
with no `.pr-` or `.xr-` residue in any file. They were reverted from the three-concept backup
rather than kept, so no copy of either survives on disk.

The three that remain are unchanged: `?how=sentence` (default), `?how=strip`, `?how=stack`.

### Copy pass — the reference register, and the blocks the page was missing
Direction from the user: the copy on Ryze and Gomega is clear, simple and direct; ours was trying to
be clever ("work worth your time", "your-next-big-thing.com", a narrator saying "I went through six
places you said matter"). We have the same feature set as them, so the copy should use the same
language. The four-card `#capabilities` block ("Growth as easy as vibe coding") is already our how-it-
works — its design stays exactly as it was.

Copy rules taken from their pages and applied here:
- Headline states the mechanism, subject-verb-object (Ryze: a flat list of what it operates).
- Capability headline is an imperative verb phrase; the body is one sentence with three verbs;
  three verb-first bullets under it (Gomega's card shape, which ours was missing entirely).
- The nouns do the work. Real product nouns only — pages, replies, negative keywords, drop-off —
  never a phrase whose meaning depends on how it is written.
- Third person about the product. First person only inside a message from the agent.
- Every number carries a unit and a timeframe.

What changed:
- **Hero.** "AI runs your leads, SEO, content and landing pages" + the four-agent sentence. CTAs are
  now Get started → `#audit` and See what it does → `#capabilities`. The writerly kicker is gone.
- **Capabilities.** Cards renamed to the agents (Leads / SEO & GEO / Content / Website), each
  description rewritten as one sentence with three verbs, each given three verb bullets and a line
  from the agent itself (Gomega's iMessage device). Added the approval line under the stations —
  the one claim neither reference can make.
- **New blocks**, all present on both references and absent here: a trust bar (placeholder logo
  slots), a full capability inventory (Ryze's 4 columns × 6), a free growth audit with a form
  (Ryze's strongest conversion device), pricing (three tiers, prices marked to be confirmed), an
  FAQ, and a closer. New nav links for Pricing and Free audit.
- **Removed** the `#how-it-works` concept-preview section and its `how-it-works.css` / `.js`,
  since `#capabilities` is the how-it-works. The three concepts are backed up outside the repo at
  `solar.before-copy-pass.bak` in the session scratchpad.
- **Fixed a pre-existing bug** in the same block: the leads artifact carried `class="story-reply-slip"`
  but `workspace.css` styles `.reply-slip`, so the slip rendered unstyled in normal flow and
  collided with the new bullets. Renamed to the class that has rules.

New files: `growth.css`, `growth.js` (the audit form is a design preview and never submits).
Verified: every in-page anchor resolves, no console errors, the audit form does not navigate, the FAQ
opens and closes, the customer-story tabs and founder quotes still work, the capability artifacts
still respond, no horizontal overflow at 430px on hero / capabilities / inventory, Space Grotesk
preserved. Content still to come from the user: customer logos, verified customer results, and
prices.

**Correction after review.** The user kept the original hero headline — "You built the product. /
Let’s find your people." — so it is restored verbatim and the `.hero-center` width override was
removed with it. The sub keeps the direct four-agent sentence, edited to "already looking for you"
so it no longer repeats "built". The solar-system founder-proof section is explicitly off limits and
was not touched (`proof.css`, `proof.js`, `space-worlds.css`, `space-worlds.js` all unchanged).
Everything else was in scope, so the customer-stories copy was brought into the same register:
heading is now "Real founders. / Real customers.", the tabs use the same names as the capability
cards, and each panel headline is the standard direct case-study shape with a `[Customer]` slot.
The result slots and "verified result to add" labels stay as they are until real numbers exist.

### Outcomes section, and separating it from the feature list
The user spotted that the capability cards and the inventory were doing the same job — both feature
enumeration, 12 items versus 24 — and that the page had no outcomes section at all. Both were right.
Ryze runs both feature blocks too, but not adjacent: pillars at position 9, the "everything you need"
grid at 11, after the free-audit CTA. Ours were back to back.

The inventory moved from position 5 to just above pricing and was reframed as the spec sheet it now
is — "THE FULL LIST / Everything in every plan. / Four agents, twenty-four jobs" — with an `is-spec`
modifier that shrinks the heading and items so it reads as reference material beside the prices
rather than a second pitch.

A before/after "what changes" table was built for the vacated slot and rejected: that shape is a
positioning device, not an outcomes section. Replaced with **outcome metric cards**, which is what
Gomega actually runs (segment → number → metric noun). Six cards, each carrying the agent that moves
it, an arrow for direction, a slot where the figure goes, and one line on the mechanism:

- ↑ Qualified leads · ↓ Time to first reply — Leads Agent
- ↓ Cost per lead — all four, as organic takes more of the load
- ↑ Organic search clicks — SEO & GEO Agent
- ↑ Qualified website visits — Content Agent
- ↑ Landing-page conversion rate — Website Agent

The direction is honest without proof; the magnitude is not, so every figure is a marked `—` reading
"verified result to add", the same treatment the customer-stories section already uses. ROAS was
raised as an example but deliberately left off: it is a paid-ads metric, both references have a Paid
Ads Agent, and Infinite does not — so it is a product question, not a copy one.

Page order is now: hero · trust bar · dashboard · capabilities · outcomes · free audit · solar system
· customer stories · the full list · pricing · FAQ · closer. Verified: no dead anchors, no console
errors, no horizontal overflow, no orphaned `.changes` rules left in `growth.css`, solar system
untouched, hero headline and Space Grotesk preserved.

### The outcomes section was cut — evidence
Two attempts at an outcomes block (a before/after table, then Gomega-style metric cards) were both
rejected, so the references were checked properly rather than from memory:

- **Gomega** has a real one: seven industry cards with one metric each (1.9× new patients, +218%
  jobs booked, −34% cost per lead), plus five customer stories carrying a percentage and a mechanism
  sentence, plus a work log totalling $58.1K revenue and $42 CPL.
- **Ryze has none at all.** Its numbers are distributed — the hero audit's bottom line, a +63% ROAS
  pull-quote inside the Wall of Love, and impact chips on each SEO fix (+18% crawl, +22% CTR,
  +31 positions).
- **Unfair's** results block is their own campaign, not a customer's: 1,800+ visitors, 50+ demos,
  1,140% ROI, with a third-party verification link. Its other number block is a typical-month
  volume funnel (200 creators → 1M seen → 18K visitors → 1,043 contacts), which is capacity rather
  than results and needs no customer proof.

None of the three runs an outcomes section built from empty slots. Ours would have been six dashes,
and the customer-stories section is already a placeholder for the same missing data. Section deleted
along with all its CSS; page order is now hero · trust bar · dashboard · capabilities · free audit ·
solar system · customer stories · the full list · pricing · FAQ · closer, which is close to Ryze's
shape. When real figures exist there are two staged routes: Ryze's (impact chips on the agent cards,
possible immediately) or Gomega's (an industry-card row, needs five to seven verified results).

### Case studies, in Gomega's shape
The before/after treatment was rejected outright. The user pointed at Gomega's case studies, so the
PDF capture was read rather than the DOM alone, and the format is:

- an anonymised **business descriptor** as the card's identity ("Regional HVAC & Refrigeration
  Company", "Immigration Law Firm") — specificity without needing permission to name anyone
- one **big percentage** with a short constant label ("growth since signup")
- a **single sentence carrying a second number** ("Search clicks increased +18.5% since signup while
  paid campaigns delivered 7,927 attributed conversions")
- a **Read case study** pill, a photo on the right, and a coverflow with the neighbouring cards
  peeking at the edges

Our `customer-stories` section already had those bones — a big-stat slot, a headline, an image and a
read-more that opens a dialog — so it was recopied into that shape rather than a third section being
added, and the separate results block was deleted. Four tabs, labelled by the figure since we have
numbers before we have names:

- **55×** growth since signup — "Monthly recurring revenue increased 55× since signup, reaching $11K
  a month." (from $200; the "reaching X now" construction is Gomega's, and avoids the before/after
  device the user rejected twice)
- **+144%** conversion growth since signup — "…now converting 2.2% of the same traffic."
- **−19%** lower cost per customer — average across accounts
- **+39%** more qualified leads — average across accounts

The two averages carry "Across every account" as their descriptor rather than a business type, so an
aggregate is never dressed up as a single customer. `[Business type]` and `[Accounts and period]`
slots remain, matching how every reference attaches a name, a period or a verifier to each number.

The tab/panel JS and the dialog were untouched and still work; `.result-support` was dropped, so
`.result-read` picks up its `margin-top:auto` to stay pinned to the bottom of the card. Verified:
four-stop arrow/Home/End keyboard nav, one panel visible at a time, the dialog opens with the
sentence as its subtitle and closes, no dead anchors, no console errors, no horizontal overflow at
430px with the tab strip wrapping, solar system and hero untouched, Space Grotesk preserved.

### Outcome-led card titles, and the full list re-cut by channel
Direction: the four cards in "Growth as easy as vibe coding" were still named after categories, and
the titles needed to be outcomes. The descriptive sentences were fine; the detail underneath could
move down into the full list, and the full list should be cut by channel rather than by verb.

Card titles, category → outcome:

| Was | Now |
|---|---|
| High-intent leads | Start conversations with ready buyers |
| SEO + GEO | Rank on Google and get cited by AI |
| Organic content | Create content that converts |
| Landing-page tests | Turn more visits into customers |

The one-sentence mechanism descriptions stayed (they were working). The three verb bullets were
lifted out of every card and their detail rewritten into the full list, whose columns changed from
Find / Write / Test / Report to **Ads · Website · SEO · GEO · Organic content** — five columns, six
jobs each, grid now `repeat(5,1fr)` with a 3-column step at 1180px before the existing 2- and
1-column steps. `.ws-does` and its rule are gone; `.ws-caption h3` drops to 25px because the
outcome titles run longer than the category names.

Three things flagged to the user rather than decided here:
- The brief said "four sections" and listed five. Five were built, as listed.
- **Ads is new to the page.** Nothing else on the site claims a paid-ads capability and there is no
  Ads agent among the four cards, so a reader now meets Ads in the full list with no agent behind it.
  Product question, not a copy one.
- The leads work (buying signals, first replies) has no column of its own in the five, so it is
  filed under Organic content.
- Consequently "One subscription. All four agents." in pricing and "Four agents" in the capabilities
  sub now sit alongside a five-channel list. Left as-is pending the Ads decision.

### SEO and GEO merged, and the full list given artwork
SEO and GEO became one column, which drops the list to four channels — **Ads · Website · SEO + GEO ·
Organic content** — and resolves the earlier "four sections, five listed" ambiguity. The twelve
merged items were cut to seven that keep both halves represented: search-demand pages and keyword
research from SEO, answers built to be cited and llms.txt from GEO, with technical fixes and schema
combined into one line and rankings and model mentions into another. Every column is now seven items,
twenty-eight jobs, and the grid is back to `repeat(4,1fr)`.

Each column gained a drawn panel above its heading, code-native SVG in the same language as the
capability-card artifacts — an ad unit with a spend bar, a browser split down an A/B seam, a search
bar answering into an AI response with a citation chip, and a fan of post cards. The first pass was
too pale to earn the space, so the flattest fills were deepened a step, the panels grew from 96px to
124px, and Organic content sits on the mint ground rather than the blue one so the row is not four
identical grey rectangles. No images, no imagegen — all shapes, so it costs nothing to load and
recolours with the palette.

Still open and unchanged by the merge: Ads has no agent among the four cards, and the Leads agent has
no channel in the list. Three of the four now line up (Website, SEO + GEO, Content ↔ Organic
content); Leads and Ads are the odd pair, and "One subscription. All four agents." still sits above
a list whose four channels are not those four agents.

### A different layout for each case study
The single copy-left / photo-right card was doing all four stories, so every tab looked identical.
Each panel now carries a `data-layout` and its own treatment:

- **01 · overlay** — the flagship 55× runs on full-bleed photography with the copy on a white card
  floating over it, image caption moved to the bottom right so the two do not collide.
- **02 · drawn** — no photograph. The conversion story shows the thing it is talking about: a small
  landing page built in HTML/CSS with a live CTA, and a badge reading "2.2% of visitors now convert"
  floating off its corner. Deliberately not a before/after — it shows the current state, not the
  journey, since that device was rejected twice.
- **03 · wide** — an average across accounts is not one customer's story, so it gets no portrait at
  all: full width, centred, with a row of dashed `[Account]` chips standing in for the spread.
- **04 · mirror** — photograph leads on the left, copy follows on the right.

Under 900px the overlay flattens to stacked image-then-card, the mirror collapses to one column, and
the drawn page's badge and note move into the flow. The tab/panel JS and the dialog are untouched —
every panel still carries the `h3` the dialog reads for its subtitle and a `data-story-open` button.
Verified: four layouts render, no unstyled classes, CSS braces balanced.

### A chart for the leads story, and the proof section in two columns
**Chart.** Panel 04's photograph became a rising line graph — area fill under a blue curve, an end
point with a halo, a `signup → today` axis and a `+39%` badge. It keeps the `mirror` layout so the
visual still leads on the left, which needed the order rule widened from `.result-image` to also
cover `.result-visual`. Only one photograph remains in the section now: overlay (photo), drawn
(landing page), wide (none), mirror (chart).

**Proof section, two columns.** `.proof-heading` moved inside `.founder-world` so the whole block
could become one grid: heading, quote, world tabs and the drag controls stacked in a 410px left
column, the solar scene in the right. The scene itself is untouched.

Two cascade traps in that section, both worth remembering:
- `space-worlds.css` sizes the stage through `[data-world="solar"] .station-stage` — specificity
  (0,2,0) — so a plain `.station-stage` rule in `growth.css` silently lost despite loading later,
  and the scene stayed `min(1200px, 100vw - 48px)` inside an 800px column. Two screenshots came back
  byte-identical before I checked the selector weight rather than the source order. The fix was
  `.founder-world[data-world] .station-stage`.
- `.station-controls` ("Your people are out there. / Drag to explore · Pause motion") is
  `position:absolute; top:785px` against `.founder-world`, tuned for the old 870px stacked layout.
  With the world down to 600px it painted over the customer-stories section below. Now placed in the
  grid as a fourth row in the left column, `position:static`.

Verified: four distinct layouts, no dead anchors, CSS braces balanced, scene fully inside its column
with nothing clipped and no bleed into the next section.

The scene was then pushed off-centre in its column — `justify-self:end` plus `translateX(6%)` — so it
sits toward the right edge rather than middled, against the left-aligned heading. Checked at 1440px:
the outer orbit still clears the container, so the section's `overflow:hidden` clips nothing.

### Proof section: deletions, a bigger scene, and a black hole
Removed on request: the `IN GOOD COMPANY` eyebrow, the `.station-controls` block ("Your people are
out there. / Drag to explore · Pause motion") and the `.world-choices` switcher.

Deleting the controls took the pause button with it, and `space-worlds.js` used `toggle` unguarded in
three places (`label()`, the click listener, the reduced-motion listener) — it would have thrown and
killed the whole orbit loop. All three are now guarded. `station.html` still carries its own toggle,
so the shared script behaves exactly as before there. Reduced-motion users still get a stopped scene:
`paused` initialises from `matchMedia('(prefers-reduced-motion: reduce)')`, which never depended on
the button. `proof.js` has the same unguarded pattern but is not loaded on either page, so it was
left alone.

The scene is ~50% larger: 800px → 1223px measured. That does not fit beside a text column at 1270px,
so the section went full-bleed (`max-width:none`, `overflow:hidden`) with the grid held to 1270px
inside it. The scene now bleeds off the right and clips at the viewport rather than mid-container.
Measured at 1440px: document horizontal scroll is 0.

The sun became a black hole — a dark event horizon (`#horizon` radial), a lensing ring, and an
accretion disc drawn twice at the orbit tilt so it passes behind the core and again in front of it.
The disc gradient runs violet → warm → violet so it belongs to the page palette. The warm
`solar-glow` was cooled to violet, and `star-surface` is now unused. The small ∞ mark that sat on the
sun was dropped — a logo inside an event horizon read oddly — and is one line to restore.

**Not verified: the orbit motion.** Headless Chrome will not advance the rAF loop under
`--virtual-time-budget`; the same two-sample test reports `MOVING: false` on the untouched
`station.html` control, so the test is invalid rather than the code being broken. The guards are in,
`node --check` passes and the page loads with no JS errors, but the motion itself wants a real
browser to confirm.

The proof heading was wrapping each half onto its own line — four lines instead of the two the `<br>`
intends — because 52px does not fit a 380px column. Column widened to 440px and the heading clamped
to `clamp(30px,2.55vw,38px)` for the two-column layout only. Measured in Space Grotesk (the saved
preference, and the widest of the five faces): 36.7px, 81px tall against a 40.4px line-height, so
exactly two lines. The scene was then shifted `translateX(-10%)`, and the heading and quote were
given `z-index:2` so text always wins if the scene's empty outer orbit reaches under them.

### Third tier becomes done-for-you at $2,000
Reference check: `valley.ai` redirects to `valley.town`, a Korean investing product — the right site
is `joinvalley.co`, supplied by the user after three guessed domains came back parked.

The two references anchor differently. **Valley** anchors against the alternative cost: "Most teams
stitch together Phantombuster, Clay, ChatGPT, and HeyReach into a $750/month duct-tape stack…
Valley replaces the stack with one engine", "One Valley seat costs $395/month and produces the
LinkedIn output of an SDR at $8,300/month loaded", plus an FAQ entry titled "What exactly do I get
for $149?". **Unfair** anchors against its own list price with scarcity: $9,900 struck to $3,490,
"4 of 20 spots left", "Slide to claim your spot", and a tier named after a person ("GTM Manager /
A person who runs your launch") whose inclusions are all run-for-you.

Applied: tier three is now **Growth, done for you** at **$2,000/month**, flagged DONE FOR YOU on a
dark chip, on its own tinted card so it reads as a service rather than a bigger plan. Inclusions
follow Unfair's "Everything in X, plus:" with concrete run-for-you lines, and the CTA is "Get your
growth lead" rather than a generic "Book a call". Valley's price-justification FAQ was added as
"What do I get for $2,000 a month?".

Deliberately not copied: Unfair's struck-through anchor price and "N of 20 spots left" both need real
numbers, and Valley's "an SDR costs $8,300/month loaded" is a specific claim I would have been
inventing. Those are the user's to supply.

Still open: Starter and Growth remain `$—`, so the page now prices its most expensive tier and not
the two cheaper ones, which reads backwards.

### Dark DFY tier, taken from the live site; chart moved onto a photograph
Pulled `infinite.fast` and its stylesheet rather than guessing at "darker". The live site's dark
language is `.overnight-section` / `.overnight-card`: a near-black base
(`linear-gradient(180deg,#000,#07090d 48%,#000)`), green and blue radial lifts
(`rgba(116,227,160,.14)`, `rgba(132,204,255,.05)`), white-alpha card surfaces
(`rgba(255,255,255,.07)` over `.026`), `1px solid rgba(245,245,244,.1)` borders, a faint 56px grid
masked with a radial, and `--paper:#f5f5f4` text on `--green:#74e3a0`.

The done-for-you tier now uses all of that: near-black ground with the green radial, a masked 34px
grid overlay, `#f5f5f4` text, green ticks and green DONE FOR YOU chip, and a paper-white CTA.
One bug caught in the render: lifting content above the grid overlay with `.tier.is-dfy>*{position:
relative}` also hit the flag, which is `position:absolute` to straddle the card's top border — it
dropped into flow and pushed the heading 21px below the other two cards' headings. Re-excluded.

The leads chart moved off its flat panel onto `assets/story-office.jpg` behind a
`linear-gradient(180deg,#0a0d16b8,#0a0d16f0)` scrim, with the SVG re-cut to use classes so the line,
grid, area and end dot could be recoloured for a dark ground — periwinkle line, white-ringed dot,
white-alpha grid — and the badge became a blurred glass card. Its note now reads "Illustrative image
and shape · figure is real".

### Header, footer and an open-source section, all built from infinite.fast
Fetched `infinite.fast` and `homepage-20260729-founder-x-posts.css` and copied the real structure
rather than inventing one.

**Header.** The live nav is `infinite | Work | Stack | Proof | Pricing | Blog | FAQ | Get Infinite`.
Ours now uses the same wording pointed at this page's sections: Work → `#capabilities`,
Stack → `#inventory`, Proof → `#results`, Pricing, FAQ, and `Get Infinite ↗` → `#audit`. Blog was
left off since there is no equivalent section here.

**Footer.** Six columns lifted from the live footer with its real hrefs — Product, Agents & Open
Source, Free Tools, Resources, Compare, Company — plus the brand line "AI CMO workspace for founders
and small teams." and "© 2026 Ultima AI, Inc." It sits above the study note, which stays so the page
is still honest about being a preview.

Worth noting: **the live footer lists "AI Ads" under Product**, so the Ads column added to the full
list earlier is a real capability after all. The open question is narrower than it looked — Ads
exists, it just has no agent card on this page.

**Open source section** (`#open-source`, between the FAQ and the closer), dark in the same
`.overnight-section` language. Every fact came from `infinite.fast/llms.txt`, nothing invented:
- install is `npx infinite-os@latest`, macOS, and "the app includes Infinite OS and its CLI"
- Infinite OS is a "public open-source local engine" with a typed action registry
- Infinite Skills has "25 marketing skills plus the Goal skill for Codex"
- Press Agent is described only as an open-source public repo, since llms.txt does not say what it does
- the closing line — live or destructive actions pass policy checks and wait for operator
  confirmation — is from llms.txt, and happens to restate the approval promise the rest of the page
  makes

The install command has a Copy button (`navigator.clipboard`, guarded, silently no-ops where the
clipboard is blocked). Verified: no dead in-page anchors, 33 external links all pointing at
infinite.fast, github.com/Infinite-Labs-AI or x.com.

### Recolour of the open-source section, and hold-to-claim
**Colour.** The section was pure black (`#000 → #07090d`) with alpha-on-black text that read grey.
Rebased on `--ink:#242532` — `linear-gradient(180deg,#282a41,#1e1f31 50%,#282a41)` — with blue and
violet radial lifts instead of the live site's green and cyan, and every body colour swapped from
alpha to a solid light value (`#cdd0e6` lead, `#c2c5da` card copy, `#aeb2cb` note). Accents moved
from `#74e3a0` to periwinkle `#aeabff`, with mint `#b8d98f` kept only for the terminal prompt.
The dark pricing tier still uses the near-black live-site treatment — ask before matching them.

**Hold to claim.** Unfair's scarcity block, rebuilt with a hold instead of a slide. Copy: "Your
first month for $2,000", "3 of 10 spots left".

The hold is a faithful vanilla port of `apps/desktop/src/renderer/research/onboarding/hold-to-start.tsx`
in the 1bu-1 app (found under `keyword-score-fix/apps/desktop`, not `src`). Everything carried over:
- `HOLD_MS 1100`, `TEACH_THRESHOLD 0.14`, `HELD_BREATH_MS 70`
- charge from wall-clock elapsed, never accumulated frame deltas, so a dropped frame cannot
  lengthen the hold
- a `--charge` custom property driving a conic-gradient rim and the heat fill, plus `charge² × 2.2`
  strain jitter
- **Enter fires instantly** as the keyboard escape hatch; **Space holds**, matching the button's
  native activation key
- a bare click **teaches**: under 14% charge the label rewrites to "Hold to claim" and the pill shakes
- **no `pointerleave` handler** — pointer capture keeps delivering pointerup when the cursor slides
  off, and a pointerleave abort would fire the instant capture is taken and kill every hold
- pop + single shockwave on release, all suppressed under `prefers-reduced-motion`

On completion it reads "Spot held" and reveals "Design preview — nothing is reserved. Book a call to
actually claim it", so the page never implies a real reservation was made. Verified in the harness:
quick tap → `declined` + rewritten label; Enter → `done`, `burst=1`, note revealed.

### Three corrections
**One heading colour, no purple.** The dark section had a two-colour heading (white + periwinkle)
and violet radial lifts. `.cli-head em` is now `color:inherit`, so the whole heading is one colour,
the violet radial is gone in favour of a plain white 10%-opacity lift over a neutral slate
(`#282a3d → #1e1f2e`), and every `#aeabff` / `#b9b6ff` / `#8f7bff` accent was replaced with a
neutral grey-blue. Zero purple tokens remain in the file.

**Equal-height pricing cards.** `.pricing-grid` was `align-items:start`, so each card sized to its
own content. Now `stretch`, with `.tier` a flex column and `.tier-cta` on `margin-top:auto` so the
buttons align at the bottom. Measured: 641 / 641 / 641.

**The hold had no visible charge — a real bug I had reported as verified.** My earlier check only
exercised the label text and the Enter path, both of which worked, so it passed while the fill did
not render: sampling mid-hold showed `phase=charging` but `--charge` stuck at `0.0000` and both the
heat and the masked ring computing to `opacity:0`. Rather than keep chasing the mask, `.hold-heat`
is now a solid `var(--blue)` panel driven by `transform:scaleX(var(--charge))` from a left origin —
compositor-friendly, and it cannot silently fail on mask support or alpha maths. Verified by driving
the property directly: `--charge:.5 → matrix(0.5,0,0,1,0,0)`, `--charge:1 → matrix(1,…)`.

Lesson for the harness: asserting on text and state attributes is not the same as asserting the
thing rendered. Where a change is visual, measure a computed geometric value.

### Pricing: the gap, real prices, and monthly/annual
**The gap.** Pinning the CTA with `margin-top:auto` was the cause — the shorter cards pushed their
button to the bottom and left a hole above it. Unfair does not do that: name → price → offer box →
CTA → feature list, so the button sits high and the list runs to whatever length it runs to. Card
order rewritten to match and `margin-top:auto` dropped. Cards stay equal height via `stretch`
(measured 659 / 659 / 659), but the slack now falls harmlessly below the list.

**Prices** are $50 and $200 as given, with done-for-you at $2,000.

**Monthly / annual**, taken from the live site: a two-button toggle labelled "Annual — Lower monthly
rate", each figure carrying both rates as data attributes. Annual shows the per-month equivalent
with the billed total underneath. The done-for-you tier has no annual rate and holds at $2,000 with
"Monthly, no annual commitment", which the swap handles by skipping any element without a
`data-annual`.

**Flagged, not decided:** the annual figures are mine, not the user's. I derived them as two months
free (−17%, matching both the live site's Max ratio and Unfair's badge): $50 → $42/mo, $500/yr and
$200 → $167/mo, $2,000/yr. The live site currently lists different numbers again — $60/month or
$600/year for Max, $200/month or $2,160/year for Ultra — so its $50 is an *annual effective* rate,
not a monthly one. The pricing note under the grid says all of this on the page.

### Pricing cards filled from the real capability inventory
The cards were showing four and five lines against a product that ships far more. The authoritative
source is in this repo: `docs/superpowers/specs/2026-08-25-expanded-pricing-matrix-design.md`, whose
inventory is grounded read-only in the closed `1bu-1` repo (`apps/desktop/src/shared/nav.ts` — 21
desktop surfaces; `docs/ai/agent-tools.md` — 79 agent tools across 14 groups; the SEO, ads and
competitor system docs). It defines 21 capabilities in 8 groups with exactly five Ultra-only.

- **Starter** now carries ten real capabilities — lead scanners across Reddit, X and Facebook Groups;
  buyer-intent qualification; keyword research and SEO/GEO briefs; calendar, custom-domain publishing
  and rank monitoring; ad creative generation; ad autopilot; content intelligence and trend
  discovery; funnels, CTAs and tracked links; site, app and revenue analytics; and the connection
  list (GA4, PostHog, Search Console, Meta, Stripe, Shopify).
- **Growth** lists "Everything in Starter, plus:" and then exactly the five Ultra-only capabilities —
  AI Visibility and citation monitoring, competitor tracking, landing-page A/B testing, faceless
  YouTube video generation, Reels creation. Five, because the spec says five; not padded.
- A proof strip under the toggle carries the spec's two code-backed figures: **79 agent tools** and
  **One growth operating system**.
- Both plans show the real **7-day free trial**.

The spec's copy guardrails were followed: Reels and YouTube promise creation/generation only and
never publishing, competitor tracking is not described as live or continuous, and no internal
architecture, model names or tool IDs appear.

This also resolves the earlier pricing ambiguity — the spec states Max is $60/month or $600/year
"displayed as $50 per month billed annually", and Ultra is $200/month. So $50 is Max's annual
effective rate and $200 is Ultra's monthly rate; they are not two monthly prices. Our cards currently
show $50 and $200 as monthly, which still needs the user's call.

**Cut back.** Ten verbose Starter rows was too much — most wrapped to two lines and the cards ran to
854px, while Growth read as empty next to it. Starter merged down to five one-line rows (lead
scanners / SEO and GEO / ads / content / funnels and stack), Growth left at six so the featured tier
is the longer of the two. Card height 854 → 659, which is now set by the done-for-you card's hold
block rather than by the Starter list.

**Trimmed again on request.** Removed the two done-for-you rows "Every draft reviewed before it
reaches you" and "Your positioning and messaging rewritten", both 7-day-free-trial badges, and the
`79 agent tools / One growth operating system` proof strip, along with their now-dead CSS
(`.pricing-proof`, `.tier-trial`). Cards 659 → 595px; items 5 / 6 / 4.

### Prices switched to the live site's, plus Unfair's struck anchor
Removed: the "Priced for a founder doing this alone" subhead, both "Billed monthly" lines, and the
design-preview note. Toggle label "Lower monthly rate" → "Save $$$".

Prices are now the live site's real figures rather than my derived ones: Starter $60/month or $50/month
billed annually ($600/yr); Growth $200/month or $180/month billed annually ($2,160/yr). Done-for-you
stays $2,000/month.

Unfair's anchor added: the struck price above the real one. Starter and Growth use their own monthly
rate as the anchor when annual is showing — an honest discount rather than an invented one —
and done-for-you carries a fixed $10,000 anchor as specified by the user.

Two layout traps on the way: the swap only targeted `.tier-price b, .tier-bill`, so the anchors never
populated until `.tier-was` was added to the selector; and neither `width:100%` nor `flex:0 0 100%`
would push the anchor onto its own line inside the price row, so it was lifted out into a sibling
`.tier-was-line` above `.tier-price` — which is how Unfair structures it anyway.

## Eyebrow trim (2026-09-07)

Four labels deleted at the user's request: the `CUSTOMER STORIES` eyebrow above "Real founders. Real
growth.", the `results-note` caveat under the stories panel ("Business types, timeframes and
photography to be added. Figures are real."), the `THE FULL LIST` eyebrow above the spec sheet, and
the `QUESTIONS` eyebrow above the FAQ.

Each of those `<h2>`s carried a top margin sized to sit under its eyebrow (17px on stories, 16px on
the spec sheet and FAQ). With the span gone the margin became a stray gap at the top of the header,
so all three were zeroed and the now-dead `>span` rules removed from `growth.css` and `stories.css`.

## Download CTA (2026-09-07)

The hero used to lead with `Get started ↗` → the free audit, with `▷ See what it does` beside it.
Question was whether to swap those for "Download app" and a GitHub link to infinite-os. Checked the
live site and four comparable projects first:

- **infinite.fast** ships a *single* hero CTA, `Download for Mac` with an Apple glyph → `/get-started`.
  Its eyebrow is `Works with Claude Code and Codex`. GitHub is a text link (`View Infinite OS on
  GitHub`) inside the open-source panel further down, never in the hero.
- **Zed** (open-source desktop app, the closest analog): `Download now`, secondary `Clone source` —
  a developer *action*, not a destination label. **Ollama**: one `Download`; GitHub in the footer
  only. **Cal.com**: `Get started` + `Book a demo`. **Dub**: `Start for free` + `Get a demo`.
  None of the four puts a repo link in a hero button.

Two facts settled the rest. Star counts are infinite-os **2**, press-agent **3**, skills **44**, so
no star chips anywhere — the Cal/Dub badge convention only reads well when the number is the flex.
And the npm description for `infinite-os` is *"Install the signed Infinite AI marketing Desktop app
for macOS"*, i.e. `npx infinite-os@latest` **is** the download. That gives the honest split the page
now uses: **button = download for people, command = install for agents.**

Changes: hero eyebrow → `Works with Claude Code and Codex`; hero primary → `Download for Mac` with
the live site's Apple glyph → `/get-started?cta=hero`; hero secondary → `Get a free growth audit`
(#audit, the page's only lead capture); note under the buttons trimmed to `For macOS. No card, no
call required.`; the closer's `Get started` matched to `Download for Mac` so one primary label runs
the whole page; first open-source card renamed `View Infinite OS on GitHub`.

`.button` carries `gap:22px`, sized for trailing-arrow buttons; a leading glyph needs a tight gap, so
`.button.download{gap:9px}` and a 15px `.apple` were added to `growth.css`. Also replaced Press
Agent's placeholder line ("Open source, public repo on GitHub") with the repo's real description.

## Chrome trim (2026-09-07)

Five more labels deleted: the hero note (`For macOS. No card, no call required.`), the whole
`.dashboard-caption` row under the workspace mockup (`INFINITE / YOUR GROWTH WORKSPACE` +
`Concept mockup · demo data · View full size ↗`), the `WHAT IT DOES` eyebrow above "Growth as easy
as vibe coding.", and the `.workspace-compare` link out to the saved four-card version.

Same margin trap as the earlier eyebrow pass: `.workspace-heading h2` carried `margin:18px 0 0` to
clear its eyebrow, so that was zeroed. Dead rules removed with the markup — `.hero-note`,
`.dashboard-caption` (base + its `@media` override), `.workspace-heading>span` and
`.workspace-compare`, each in both their base and responsive forms.

The dashboard image is still wrapped in its own link to the full-size PNG; only the caption's
duplicate "View full size" link went.

## Study chrome removed (2026-09-07)

Deleted: the `.cli-note` policy line under the open-source cards, the whole `.study-footer` ("A coded
vibe study…" / "Font control changes the heading…" / `Reference notes ↗`), the floating
`.trail-controls` bar (`Possibilities · Replay entrance · Saved version ↗`), and the `PRICING`
eyebrow above "One subscription. All four agents." `.pricing-head h2` lost its 16px eyebrow-clearing
top margin, same as the earlier passes.

The four-colour swatch strip lived inside `.study-footer` and went with it — it was one block, not a
separate element.

The floating bar is not in the markup: `../infinite-possibility-trail/trail.js` injects it, and the
neighbouring study loads that same file, so editing it there would have changed a study that is not
ours to touch. Instead `growth.js` now drops the node on load. Safe because trail.js wires the replay
handler synchronously against the element it just created (`controls.querySelector('button').onclick
= reveal`) — it never re-queries the document, so removing the node afterwards throws nothing.

Verified the hero possibility cards still render after the removal by diffing `peek-headline` and
`possibility-layer` counts against the two previous DOM dumps: identical, so trail.js is unaffected.

Also bumped the cache-busting query strings that were stale from this session's edits:
`workspace.css?v=5`, `stories.css?v=3`, `growth.css?v=2`, `growth.js?v=2`.

## Typeface picker removed + audit page (2026-09-08)

**Picker gone.** The `TYPEFACE` control is deleted from the nav, along with its script and its
`.font-picker` CSS. It was the only way to reach Space Grotesk, so `<body>` is now pinned to
`data-type="space"` — the accepted choice — instead of `instrument`. The other `body[data-type=…]`
blocks and their `@font-face` rules stay in `#font-study-styles` but are inert now; an unreferenced
`@font-face` downloads nothing.

**New page: `audit.html`** (+ `audit-page.css`, `audit-page.js`). The audit form no longer swallows
its own submit — it navigates to `audit.html?site=…`. Only the site travels in the query string; the
email is deliberately left behind rather than put in a URL.

*Left column* — the scan. A browser frame holding a wireframe of "their" page, with a beam sweeping
top to bottom on a 3.6s loop. Each wireframe block lights as the beam reaches it, driven by a shared
`wfLight` keyframe plus a per-block `animation-delay: var(--d)` — the delay is the only thing that
differs, so the lighting stays locked to the beam with no JS. Structural tags (`nav`, `h1`, `cta`,
`offer`, `pricing`, `form`) fade in on the same offsets. Below it, four passes tick through on a
2.4s timeline with a progress meter, then the eyebrow and closing line swap to the finished state.

The passes describe *process*, never findings. Naming a real customer site and then showing invented
results next to it would be a different kind of lie than a placeholder elsewhere on the page, so
nothing on this screen claims to have found anything.

*Right column* — booking. unfair.so books through **Cal.com** (`data-cal-link="team/unfair/gtm"`,
click-to-modal; confirmed in their markup). Same vendor here, but as an **inline** embed since it has
to hold a column rather than open over one. `CAL_LINK` at the top of `audit-page.js` drives it: set
it and the live grid replaces the placeholder panel.

`CAL_LINK` is empty on purpose. `cal.com/infinite` belongs to Nikhil Srinivasan, and `cal.com/river`,
`cal.com/team/infinite` and `cal.com/ultima` all resolve without proving they are ours. Pointing a
live booking widget at an unverified handle would let a reviewer book a stranger's calendar, so it
waits for the real link.

## Cal.com wired (2026-09-08)

`CAL_LINK = 'founders-ultima/ultima-demo'` — "Ultima Demo", **20 minutes**,
`requiresConfirmation: false`, indexable. Found in `1bu-1/scripts/ralph/prd.json`, which names
this exact link for an inline Cal embed. The other live one, `cal.com/team/ultima/demo`, is
`noindex` with null metadata and a placeholder avatar, so it looks half-set-up; this is the real one.
Copy changed from "fifteen minutes" to twenty to match the event.

**There is no Cal.com API key in either repo.** Checked 28 `.env` files at shallow depth plus all
source: only `CAL_COM_URL` (a local const in `scripts/seed/fire-your-agency.ts`) and `CAL_PROPS`.
Nothing needs one — the inline embed takes only the public link. A key would matter for the
gomega-style headless build, or for the Cal webhook integration 1bu-1's schema already anticipates
(`cal_connections`, `cal_pending_bookings`, migration 158).

Branding follows doublespeed's pattern, in light instead of dark:

```js
Cal('ui', { hideEventTypeDetails: true, showTimezoneWhenEventDetailsHidden: true,
  cssVarsPerTheme: { light: {
    'cal-brand': '#3d3df5', 'cal-bg-muted': '#fcfcff', 'cal-border-booker-width': '0px' } } });
```

The column heading already states the duration, so Cal's own title/duration block is redundant —
hidden, with the timezone line kept because it is the one thing the heading cannot say.

The lead now rides in `sessionStorage` (`infinite-audit-lead`), not the query string: it survives the
navigation from the audit form but never lands in a server log, a referrer header, or a pasted link.
It prefills Cal's `email`/`name`, with the site as `url` plus a `notes` line.

Two failure paths covered: a 6s watchdog that swaps in a prefilled `cal.com/…` link if no iframe
appears, and a `bookingSuccessfulV2` handler that turns the column into a confirmation.

**Verified:** the embed script loads, an iframe mounts, `data-live` is set, the placeholder is
removed, the watchdog stays hidden, and the UI config applies (no event-type block, timezone line
present, border flush). **Not verified:** availability slots populating — headless renders the
loading skeleton, so that needs a look in a real browser.

## Gate + house alignment (2026-09-08)

The background repo scan settled two things.

**No API key exists** — no `cal_live_` literal anywhere in either repo, and no `.env` mentions Cal at
all. Confirmed, not inferred.

**`CAL_PROPS` in `1bu-1/src/app/custom-domain/welcome/page.tsx`** carries
`calLink: "founders-ultima/ultima-onboarding"` — a second event on the same profile, already embedded
in production. That confirms `founders-ultima` is theirs, so `founders-ultima/ultima-demo` was the
right pick.

**The gate question was already answered in their own codebase.** `LeadgenAuditForm`
(`src/lib/templates/landers/components/template-sections/leadgen-audit-form.tsx`) documents itself as
"Submits to /api/leads with source 'leadgen-audit'. After submit, shows success message + Cal.com
embed for booking" — the doublespeed shape, already the house pattern. So the audit page now gates:
no lead in `sessionStorage`, no calendar. It only fires for someone who reached `audit.html` by URL
rather than through the form, and the site field prefills from `?site=`. Submit label is
doublespeed's "See available times".

If the prototype ever needs to actually store leads, `submitCrmForm` → `/api/leads` is the existing
path, not something to invent.

Two alignments to the house component: `origin` moved from `https://app.cal.com` to `https://cal.com`
(re-verified — the iframe still mounts). And worth noting in the other direction: `CalEmbedInline`
passes only `layout: "month_view"` with no `Cal("ui", …)` at all, so this page is now the more
branded of the two. The three-line `cssVarsPerTheme` block would port straight back into
`cal-embed.tsx` if wanted — not touched here, different repo.

Full-tree scan (3.9M files) turned up every Cal event referenced across both repos, checked live:

| link | length | indexed | title |
|---|---|---|---|
| `founders-ultima/ultima-demo` | **20 min** | yes | Ultima Demo ← in use here |
| `founders-ultima/30min` | 30 min | yes | Ultima Demo (same event, longer slot) |
| `founders-ultima/ultima-onboarding` | 45 min | yes | Ultima Onboarding (the welcome page) |
| `team/ultima/demo` | 30 min | no | Ultima Demo |
| `ultima/enterprise` | — | — | **404 — stale reference in 1bu-1** |

Env names across the whole tree: `CAL_COM_URL` and `CAL_PROPS`. No key, confirmed exhaustively.

## Full Cal branding (2026-09-08)

Pulled Cal's own stylesheet and extracted the real token set — 76 `--cal-*` variables. Two things
came out of that:

**`cal-border-booker-width` does not exist.** Doublespeed sets it, and it is a no-op against the
current CSS. The real token is `cal-border-booker`, which defaults to `var(--cal-border-subtle)`;
setting it to `transparent` is what actually removes the booker's frame. Our config was carrying the
dead one because it was copied across — now fixed.

The embed is mapped onto the page's palette with verified names: `cal-brand` → `--blue`,
`cal-brand-emphasis` → `--blue-dark`, `cal-border` → `--line`, `cal-text-emphasis` → `--ink`,
`cal-text-subtle` → `--muted`, plus the bg and border scales. Visible in the render — the day cells
pick up the indigo tint instead of Cal's default grey.

**`founders-ultima` is a user, not a team** (`cal.com/team/founders-ultima` → 404), and
`ultima-demo` has `teamId: null`, `schedulingType: null`. So it is already a personal 1:1 — the call
already goes to one calendar and nothing needs changing for that.

**The Ultima → Infinite rename is dashboard work, not code.** There is no API key, so it cannot be
done from here. What can be: the last hardcoded `cal.com/founders-ultima/ultima-demo` was removed
from `audit.html` (the watchdog link now derives from `CAL_LINK`), so `CAL_LINK` is the single source
of truth and the rendered page contains zero occurrences of "ultima".

Handle availability, checked live: `cal.com/infinite` is taken (Nikhil Srinivasan) and
`cal.com/team/infinite` is taken. Free: `infinite-fast`, `infinitefast`, `getinfinite`,
`founders-infinite`, `infinite-labs`, `hey-infinite`, `withinfinite`.

Renaming the **username** would break `1bu-1/src/app/custom-domain/welcome/page.tsx`, which hardcodes
`founders-ultima/ultima-onboarding`, plus the outreach test fixtures and `scripts/ralph/prd.json`.
Renaming the event **title** changes no URL at all; renaming the event **slug** only affects this
page and prd.json.

## Review fixes (2026-09-08)

Three defects found by review, all verified before changing anything.

**The audit page leaked the visitor's email into analytics.** `audit-page.js` put the captured email
into the Cal fallback anchor's `href` as a query parameter. Session replay does not mask attribute
values and autocapture reads the href on click, so porting the live analytics as-is would have
recorded it. The href is now bare and the prefilled URL is built at click time instead. Verified: the
email no longer appears anywhere in the rendered DOM.

This is the same lesson the live site already learned — `SENSITIVE_PATHS` exists because the
get-started page "renders a verified email", and one of the forward-fixes after the #48 revert was
specifically about keeping identity out of analytics events. The audit page belongs in that list too
once analytics ship; the DOM fix is necessary but not sufficient.

**The pricing toggle left stale values going back to Monthly.** `swap()` tested `if (v)`, but empty
string is a real value here: the done-for-you tier has no annual rate and Starter/Growth have no
monthly anchor, so all three carry `data-monthly=""`. Falsy-testing skipped exactly the fields meant
to clear, so Annual → Monthly kept the struck anchors and "billed annually" while the button read
Monthly. Correct on first load, wrong after a round trip. Now `if (mode in el.dataset)`.

**The Cal fallback took six seconds to appear.** Under the live CSP the embed script is blocked
outright, so the watchdog was the only path to the fallback — every visitor would get a blank 520px
panel with no spinner first. The loader now listens for the script's own `error` event and shows the
fallback immediately, with the watchdog kept for the slower failure where the script loads but no
iframe ever mounts.

## Port build, first pass (2026-09-08)

Three blockers cleared. Staging only — nothing deployed, nothing flipped.

**Assets consolidated.** The two pages reached fonts, the hero screenshot, both avatars and the trail
stylesheet and script through `../` and `../../` into sibling study directories, which 404 at the real
host. 11 files copied into local `fonts/` and `assets/`, 18 references rewritten. `trail.js` pulled two
ad creatives of its own that the first inventory missed — caught by re-scanning the copied file rather
than the originals. Verified: no `../` left in the shipping files, every request returns 200.

Ivory, Fraunces and Bricolage were dropped instead of copied. They stopped being reachable when the
typeface picker was removed and `<body>` was pinned to Space Grotesk, so shipping them was three dead
font files.

**A regex mistake worth recording.** Deleting those font families with
`body\[data-type="ivory"\][^\n]*?(?=\n…)` ate the closing braces of all three media queries — the
match ran to end-of-line, and inside a minified `@media` block that includes the brace that closes it.
The file still parsed as HTML and the page still rendered, so nothing looked wrong; only a brace count
caught it (9 open, 6 closed). Fixed by rebuilding the whole block explicitly rather than patching the
damage. Lesson: do not regex-delete rules out of a minified stylesheet — rebuild the block.

**CSP.** `script-src` gained `https://app.cal.com`, `frame-src` gained `https://cal.com
https://app.cal.com`. `connect-src` deliberately untouched — the widget's own fetches run inside
cal.com's iframe under cal.com's policy, so ours never sees them. Verified the four ad-pixel hosts
survive and no other key in `vercel.json` changed.

**One checklist item was wrong and is corrected.** "Ship as `audit/index.html`, never `audit.html`"
constrains the route's `path`, not the source filename. The build maps `source` → dist path — the home
route's source is a flat `index-scheme-wrangle.html` written to `dist/index.html` — so the prototype's
filenames can stay. What still has to change is the in-page links, which are bare relative.

## Code review round (2026-09-08)

Onyx reviewed the actual changes, not the plan. One HIGH, and it was the thing I had flagged as most
likely wrong.

**The asset consolidation was the wrong fix.** Bare-relative paths resolve only while the page sits
flat beside `fonts/` and `assets/`; at `solar/index.html` they would 404. Worse, the build already
copies the repo's top-level `assets/` and `fonts/` to dist root (`deployEntries`), so five of the files
copied in were duplicates of things the site already serves. Corrected: those five now reference their
canonical paths, the six that genuinely do not ship moved into `/fonts/instrument/` and
`/assets/growth/`, and all 18 references are root-relative. Verified all ten return 200.

Still open by choice: the eleven bare-relative CSS and JS references. The homepage build inlines its
stylesheets rather than linking them, so where these land depends on the injector wiring — guessing a
depth now would just be a second wrong fix.

**`window.calFailed` dropped.** `showFallback` was already in lexical scope for the loader's error
handler; the global and its `typeof` guard were both unnecessary.

**And the error listener alone was not enough.** A CSP-blocked script does not reliably fire the
element's `error` event — several browsers only raise a document-level `securitypolicyviolation`. Since
a CSP block is this page's actual failure mode today, it now listens for both and falls back on either,
with the 6s watchdog still backstopping the slow case.

Confirmed correct and unchanged: the C1 email fix (the email exists only as a `window.open` argument,
never a DOM attribute, so neither replay nor autocapture can reach it), the pricing toggle, and the
`vercel.json` CSP edit. Onyx retracted its own earlier suggestion to add a load-time `swap('monthly')`
— the HTML is authored in the monthly state, so it is unnecessary.

`trail.js`'s dead `../infinite-coded-v1/index.html` link removed; zero `../` now remain in the shipping
files.

## Route registered and wired into the build (2026-09-08)

**`/audit/` is a real route now.** Added to `scripts/lib/public-site-manifest.mjs` following the
`/get-started/` template exactly — the closest existing analogue, being transactional and gated:

```js
route({ id: "audit", path: "/audit/",
        source: "_agent_artifacts/infinite-capability-workspace/audit.html",
        owner: "site", indexable: false, footer: false, … })
```

`indexable: false` keeps it out of the sitemap, `footer: false` out of the site nav, and
`documentLog` defaults true so it is still counted. Verified with the manifest's own
`assertPublicSiteManifest()`: 23 routes, 23 counted, 21 in the sitemap, `/audit/` counted and not
indexed.

Worth recording: `middleware.js` does not keep its own copy of the path list — it does
`new Set(MANIFEST_DOCUMENT_PATHS)`. So the guardrail that asserts the two match is structurally
satisfied and a route can never drift out of middleware. The checklist's "add it to all three
manifests" was already wrong; this is why.

**Build wiring.** `prepare-static-deploy.cjs` now copies the growth pages into place before
`inject-analytics` runs, so they get the same analytics treatment as every other page. The HTML
becomes a directory index and its page-local CSS/JS are copied into the same directory.

That settles the depth question left open earlier, and the answer is a split rather than one rule:
**shared fonts and images are root-relative** (they ship to dist root from `deployEntries`), while
**page-local CSS and JS stay sibling-relative** because they travel into the page's own directory.
So `audit-page.css` needed no rewrite at all.

Verified: `dist/audit/index.html` builds with `audit-page.css` and `audit-page.js` beside it.

**Not verified** — the build then fails at `inject-analytics` with `Cannot find package 'infinite-tag'`.
Confirmed pre-existing by re-running from the untouched backup: identical failure. `npm ci` has not
been run in this worktree. So the page builds and is wired, but the analytics injection itself is
still unproven here — and note the main checkout has `infinite-tag@0.3.5` installed while the pin
needs to be 0.9.1.

## The port is proven end to end (2026-09-08)

Two corrections first, both from River pushing back on the version claim.

**The `0.3.5` I reported was `node_modules` in a stale checkout, not a pin.** `origin/main` and this
branch both pin `infinite-tag@0.9.1`. Read the pin, never the installed version.

**And "the analytics work is on unmerged branches" was wrong.** It is merged into `origin/main`
(`100ee81`, 2026-09-06). Local `main` was simply 47 commits stale, and I read it without fetching.
This branch is 7 behind / 3 ahead of `origin/main`, not 43 off a stale base. That error propagated
into the checklist and both review briefs; the trap section is rewritten to say "fetch before you grep".

**Then the proof.** `npm ci` installed 0.9.1, the build ran clean, and `/audit/` came out with the
full analytics treatment — 7,220 bytes of analytics-free source in, 50,615 bytes out:

```
__infiniteConsentGate            4        posthog.init                    1
gtag(                            5        googletagmanager                1
data-infinite-runtime            1        infinitePrivacyChoices          1
infinite_landing_attribution_v1  1        collectPath                     3
```

Identical counts to the built homepage — consentGate 4, posthog 1, gtag 5, runtime 1. The page is
getting byte-for-byte the same treatment as every other page on the site.

Built with `G-TEST1234` / `phc_test_project_token`, so nothing could reach a production aggregate.

Both guardrails pass locally: `test-inject-analytics.mjs` and `test-prepare-static-deploy.mjs`, exit 0.
Worth running by hand — GitHub Actions is down, so CI is not a backstop right now.

## Audit page simplified to a lead form (2026-09-08)

River clarified the flow: it is not a gate. Website + email are taken on the homepage form; the audit
page shows the scan and a booking calendar, tells them the audit lands tomorrow, and that is the whole
thing. There is no unlock, no verification, no re-entry.

Removed accordingly: the `.book-gate` form (email + site re-entry with a padlock), its 11 CSS rules,
and the whole no-lead branch in `audit-page.js`. The calendar now mounts unconditionally — prefilled
from the carried-over lead when present, and still fully working on a cold visit with no lead at all,
because booking the call is the goal and nothing should block it. Verified: on a cold URL with empty
`sessionStorage` the Cal iframe still mounts and zero `book-gate` markup remains.

This settles the first of the two "product decisions". It was never a real decision — I had modelled
the page on get-started's claim-minting gate, which was the wrong analogue for a marketing lead form.

Three checklist items also came off as already-provisioned, because this is the same site and same
Vercel project, not a new deploy: `productionHosts` (infinite.fast), the Log Drain (active since
2026-08-02), and the CSP report endpoint (`api/csp-report.js`, already in the repo). Treating the work
as a fresh project had inflated the list.

The one real piece of new-page work left is where the lead lands: the homepage form still only writes
to `sessionStorage`. That needs a POST — get-started's `submitCrmForm` → `/api/leads`, or its own
endpoint. River's call.

## Lead capture wired to landing_leads (2026-09-08)

River was right that the db already stores leads — and it was pre-provisioned for this exact page.
`landing_leads` (migration 114: full_name, email, message, source, created_at) already whitelists
`source: "leadgen-audit"` (migration 191), for an audit form that did not exist yet. The Cal side
stores too: `cal_pending_bookings` holds attendee name/email/booking_uid at booking. So both moments
of the flow — the lead and the booking — already have a home. No new storage built.

The only gap was reach: the marketing site is a static Vercel deploy with no server routes, and
`/api/leads` lives in the app. Fixed with one rewrite following the five existing `/infinite/*`
proxies — `/infinite/leads` → `api.ultima.inc/api/leads` — and the homepage form now POSTs the lead
there before navigating to the booking page.

Details worth keeping:
- Fire-and-forget with `keepalive: true` and a `.catch`, so the POST never blocks the navigation to
  the calendar and a failure is silent.
- Local testing cannot pollute production: the proxy only exists on Vercel, so on localhost the POST
  hits a missing route (501/404), is caught, and the flow continues.
- `/api/leads` hard-requires a non-empty `fullName`; the form collects site + email only, so the site
  is sent as the name — real data the visitor gave, never a fabricated person. A name field would give
  a cleaner value if wanted.
- Two now-false "nothing is submitted / nothing is stored" preview lines were corrected: the homepage
  form's caption now describes the audit, and the audit page's scan-note (which implied the page
  submits) was removed.

Verified: payload validates against the endpoint contract (fullName non-empty, email valid, source in
the allowed set); localhost POST is a non-2xx that the catch drops.

## Lead capture matched to the production form (2026-09-08)

River asked what other teams do here. The answer was in the repo: 1bu-1's own
`leadgen-audit-form.tsx` uses the exact `source: "leadgen-audit"` and does the opposite of the
fire-and-forget I first wrote — it `await`s the POST, reveals the Cal booking only on success
(`setSubmitted(true)` inside the try), and shows the server error on failure. `submit-crm-form.ts`
checks `response.ok`, throws a friendly message on 429, and surfaces the endpoint's error otherwise.

The homepage handler now matches that contract:
- **Await the POST, gate the navigation on success.** The visitor only moves to the booking page once
  the lead is captured; a failed submit stays on the form.
- **Inline error + re-enabled button** on failure, with the 429 "one moment" message carried over.
- **Submitting state** — the button disables and reads "Sending…" during the request.
- **Client-side email check first**, so an obviously-bad address never fires a request. This also
  closes Onyx's `type="text"`/`novalidate` nit: the email field is now `type="email"` `required`, and
  the site field `required` with `inputmode="url"`.

Fire-and-forget with keepalive is gone. It was the wrong call for a lead form — the whole point is
reliable capture, and their design gates the reward (the calendar) behind a confirmed submit exactly
so a dropped lead can't slip through while the visitor sails on to booking.

Verified: seven contract points hold in `growth.js` (awaits, gates nav on success, handles 429,
surfaces server error, re-enables on failure, validates email first, no keepalive). Local submits
still cannot reach production — the proxy only exists on Vercel, so the awaited fetch fails on
localhost, the catch shows an error, and nothing is written.

## CTA tagging, SENSITIVE_PATHS, and the Meta CAPI boundary (2026-09-08)

Page tasks done and verified in the built output:
- `/audit/` added to `SENSITIVE_PATHS` — replay + autocapture off, since the page prefills an email.
- 9 CTAs tagged with the existing vocabulary (download-mac, audit-request, view-pricing, audit-submit)
  across hero / navigation / pricing / final-cta / audit surfaces.
- Audit form marked `data-conversion="signup"`; email field is `type=email required`.
- Both guardrail tests pass; the built `/audit/index.html` carries the injected analytics identical to
  the homepage.

**solar.html does not ship as the homepage.** `dist/index.html` is still built from the old
`index-scheme-wrangle.html`; only `/audit/` is registered. The solar.html CTA tags are correct but
reach nothing until solar.html is wired in as the home route source — a deliberate homepage swap,
gated on filling its 11 bracketed placeholders. Not done silently.

**Meta CAPI — the relay already exists; the wiring is 1bu-1 server work, scoped not built.**
`src/lib/analytics/meta-capi-relay.ts` (PR #3059) maps `signup→CompleteRegistration`, `lead→Lead`,
`purchase→Purchase`, fired from `/api/analytics/events/server`, opt-in per source with a pixel on file.
Missing: a `booking→Schedule` mapping, the Cal webhook emitting a booking outcome, and the audit lead
emitting a `lead` outcome (dedup on booking_uid). The analytics-architecture skill is explicit that a
booked call is server-truth anchored on the webhook, never a browser event — so none of this belongs
on the marketing page. Two hard blockers to doing it from here: this local 1bu-1 checkout is BEHIND
the relay merge (the file does not exist in it), and the surface is under an active review-gated fleet.
It must be done on current origin/main through the proper branch and review.

**Cal event rename (Ultima→Infinite):** attempted via the browser; app.cal.com showed a login screen,
so it needs the account signed in first. Not a credential task I can do — River logs in, then it is a
title edit in the dashboard (zero URL change; the slug/username are the ones that would need code).

## Shared sticky header across all pages (2026-09-08)

River chose Variation B (capsule nav). Built as a shared component injected at build time, the same
mechanism as the footer — not 23 hand-edits.

- `scripts/lib/site-header.mjs` — `renderSiteHeader({currentPath})`, real cross-page nav
  (Features / Agents / Tools / Compare / Pricing / Hub↗ / FAQ), Get Infinite CTA → /get-started,
  current-page aware, self-contained. Hub links out to hub.infinite.fast.
- `assets/site-header.css` — Variation B: sticky, backdrop-blur, capsule nav with a raised-chip
  current item, ink pill CTA, hairline-on-scroll. Own tokens + `/fonts/instrument/` logo face so it
  renders identically over any page's stylesheet.
- `scripts/apply-site-graph.mjs` — new `applySiteHeaderToHtml`: strips each family's existing header
  (feature-shell / seo-nav / topbar / the option-4 homepage's own `site-header`) and injects the
  shared one after `<body>`, idempotent on rebuild.

Class named `public-site-header` (not `site-header`) on purpose — the option-4 homepage already uses
`class="site-header"`, so the shared name matches the footer's `public-site-footer` convention and
avoids a cascade collision.

Applies to 21 pages (all public routes) except two, by `header:false`: `/audit/` keeps its bespoke
two-column flow nav, and the header is off wherever it would fight a page's own chrome.

Two bugs caught by the checks and fixed: get-started was skipped because the inject loop filtered on
`route.footer` (and get-started is footer:false) — the loop now includes header-only routes; and the
homepage failed the "no render-blocking stylesheet" guardrail — the header CSS is now deferred on the
homepage like the footer's.

Verified: every one of the 21 pages carries exactly one shared header with its old header element
gone; both guardrail tests pass; rendered correctly on features, get-started and the homepage. Nothing
deployed — staged on the branch.

## Header class renamed to `site-header` (2026-09-08)

Reverted the `public-site-header` prefix to plain `site-header` at River's call. The prefix was to
avoid colliding with the option-4 homepage's own `.site-header` CSS — but that CSS is homepage-only
(inlined, nowhere shared) and the option-4 homepage is being replaced in the flip, and nothing goes to
main until the whole new site is ready. So the collision only ever existed on a page that is being
deleted, in a state that never ships. Disambiguation now rides entirely on the `data-site-header`
attribute (kept), which the option-4 stripper is guarded against so it strips option-4's header but
never our own. Verified idempotent (double-apply → one header) and both guardrails green.

## Adversarial analytics review — 3 fixes (2026-09-08)

An Opus reviewer found three real analytics defects (all verified against the runtime + live bytes):

**#1 HIGH — sign_up_click double-fired.** `data-conversion="signup"` on the `<form>` plus an inner
submit button hit BOTH of the runtime's lanes: the click lane (`closest('[data-conversion="signup"]')`
walks button→form) and the submit lane (`form[data-conversion="signup"]`). `emit()` has no dedup, so
one submit = two ledger conversion events — a 2× inflation on the one lane whose whole point is honest
provenance. Fixed by moving `data-conversion="signup"` from the form to the submit button: the click
lane matches the button and `return`s before site_click (verified in the runtime), and the submit lane
no longer matches (needs form-level). Exactly one event now, and it captures the button's
`audit-submit`/`audit` tags, which the form-level marker had been dropping.

**#2 MEDIUM — "Download for Mac" CTAs mislabeled.** Three buttons tagged `download-mac` actually point
at `/get-started`, so they fire `get_started_clicked` / `sign_up_click`, never an app-download event —
the id contradicted the event. The live site tags these exactly as `data-analytics-cta-id="get-started"`
+ `data-download-location="<surface>"` and reserves `download-mac` for the real `/download` link.
Retagged all three (solar hero + final, audit nav) to match live.

**#3 MEDIUM forward-risk — no stripper for solar's nav.** When solar becomes `/`, the header injector
had no pattern for its `<nav class="nav" aria-label="Main navigation">`, so it would ship a duplicate
header + split nav-CTA provenance. Added the stripper; simulated solar through the injector → its own
nav stripped, exactly one shared header.

Clean per the reviewer (not padded): SENSITIVE_PATHS `/audit` correctly matches `/audit/`; the lead
POST leaks no PII and can't double-submit; the header injection across the 21 current pages is exactly
one header each with no remnants. Both guardrails still pass after the fixes.

## Page-body reskin onto solar (2026-09-08)

River: reskin all page bodies onto solar's system (keep layouts/copy, restyle), agent in parallel.
Foundation: `assets/site-base.css` — solar's tokens (--ink/--blue/--line/etc), @font-face
(Instrument/Inter/Plex Mono), and button/eyebrow primitives — injected on every reskinned page
before the header (deferred on the homepage). Wired via the header-injection mechanism.

My slice (done, verified in build): `feature-pages.css`, `seo-pages.css` (the shared core for
agents/compare/tools), `agents-pages.css`. Each: dropped its own @font-face + token :root, consumes
site-base tokens, headings → Instrument Serif weight 400 with -.045em, body → Inter, eyebrows → mono
uppercase, one blue accent (killed the pink/cyan gradient buttons + busy grid backgrounds), hairline
--line borders, radius 22→14, lighter shadows. A token-role clash forced a real rewrite of
seo-pages.css: it used `--display` as its BODY sans while solar's `--display` is the serif heading
face — a naive override would have rendered body text in serif.

The old in-page `.seo-nav`/`.seo-footer` are stripped by the header/footer injection anyway;
`display:none` added as a belt-and-braces.

Agent's slice (in parallel, no file overlap): `compare-pages.css`, `install-guide.css` (get-started
/login), and a new `legal-pages.css` (privacy/terms).

Verified: features + agents render as solar; both guardrails pass; every reskinned family CSS has
balanced braces and no @font-face. Nothing deployed — staged.

## Body reskin — all families done (2026-09-08)

Every page family is now on solar. Agent's slice merged + verified alongside mine:
- **compare-pages.css** (agent) — compare-specific only; hairline verdict panels, mono eyebrows,
  killed the pink→blue gradient CTA for a calm --sunk panel. Renders solar (verified /compare/infinite-vs-blaze).
- **legal-pages.css** (agent, new) — light long-form sheet for privacy/terms; defensively neutralises
  the old dark inline theme. Wired via a `<link>` before `</head>` on privacy/index.html + terms/index.html
  (placed after the inline `<style>` so it wins). Renders clean light solar (verified /privacy).
- **get-started/install-guide.css** (agent) — the install animation only; the page CHROME lived in a
  6.5KB inline `<style>`, which I reworked: :root tokens → solar (#242532/#606477/#3d3df5, InterVar +
  PlexMono), h1 → Instrument Serif 400, the black primary button → solar blue. Renders solar (verified
  /get-started — the login page River called out).

Concern the agent raised that turned out already-handled: compare/privacy/get-started don't LINK
site-base in source, but the header injection adds it at build time (verified site-base=1 on all three),
so the agent's tokens resolve.

State: features, agents, tools, compare, privacy, terms, get-started all reskinned onto solar under the
shared capsule header + footer. Both guardrails pass. Nothing deployed.

Still not reskinned: the HOMEPAGE (`/`) — it's the one page with no family stylesheet; it needs solar
wired as `/` and its placeholders resolved, which is the remaining body work.

## Mobile audit + mobile menu (2026-09-08)

River: verify everything is mobile-friendly. Measured every page at a TRUE 390px viewport via a
same-origin iframe harness (reliable, unlike --force-device-scale-factor which fakes overflow).

Result: every page reports `scrollWidth == 390` — zero page-level horizontal overflow across /,
features, agents, tools, compare, get-started, privacy, terms, audit. The one wide element (the
compare table, 881px) is correctly in a `.compare-table-wrap { overflow-x:auto }` scroll container
(agent's work), so it scrolls internally rather than breaking the page.

One real bug found and fixed — the MENU BAR: the shared header hid its nav links (`display:none`)
below 900px with NO hamburger, so mobile users couldn't navigate. Added a mobile menu to
`site-header.mjs` + `site-header.css`: a hamburger button (animates to an X) that toggles the nav as
a full-width dropdown panel below the header; Escape and link-clicks close it; current page
highlighted. Verified open/closed on mobile.

Also verified on mobile (390px): the audit page stacks its two columns (scan → booking), the Cal
widget's month grid fits the width, the solar sign-up form stacks, and the shared footer stacks its
column grid (2→1). All good; both guardrails pass. Nothing deployed.
