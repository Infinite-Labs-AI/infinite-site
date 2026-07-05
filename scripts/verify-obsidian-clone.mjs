import { access, readFile, stat } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const requiredSnippets = [
  "<header",
  "<nav",
  "The growth agent for founders",
  "https://www.infinite.fast/",
  "<title>Infinite - The growth agent for founders</title>",
  "property=\"og:title\" content=\"Infinite - The growth agent for founders\"",
  "property=\"og:description\"",
  "property=\"og:type\" content=\"website\"",
  "property=\"og:url\" content=\"https://www.infinite.fast/\"",
  "property=\"og:image\" content=\"https://www.infinite.fast/assets/infinite/black-hole-social-preview.png\"",
  "property=\"og:image:width\" content=\"1200\"",
  "property=\"og:image:height\" content=\"630\"",
  "property=\"og:image:alt\" content=\"The growth agent for founders. Get Now.\"",
  "name=\"twitter:card\" content=\"summary_large_image\"",
  "name=\"twitter:title\" content=\"Infinite - The growth agent for founders\"",
  "name=\"twitter:image\" content=\"https://www.infinite.fast/assets/infinite/black-hole-social-preview.png\"",
  "Book a demo call",
  "demo-modal",
  "calendar-frame",
  "https://calendar.app.google/QtpCpF9hVrKUnZDF6",
  "Open calendar",
  "data-open-demo",
  "assets/infinite/black-hole-favicon-32.png",
  "assets/infinite/black-hole-favicon-16.png",
  "infinite",
  "GitHub",
  "@infiniteOS_",
  "Discord",
  "Privacy",
  "Terms",
  "Made with 🤖 by",
  "river",
  "assets/infinite/black-hole-command-hero-desktop.webp",
  "assets/infinite/black-hole-command-hero-mobile.webp",
  "hero-background",
  "hero-built-ins",
  "AUTOMATE",
  "META ADS",
  "FINDING LEADS",
  "ANALYTICS",
  "GEO &amp; SEO",
  "fonts/ibm-plex/ibm-plex-sans-400.ttf",
  "fonts/ibm-plex/ibm-plex-sans-700.ttf",
  "fonts/ibm-plex/ibm-plex-mono-400.ttf",
];

const forbiddenSnippets = [
  "<footer",
  "MIT License",
  "Get Started For Free",
  ">download</a>",
  "linear-gradient(rgba(42, 88, 67",
  "linear-gradient(90deg, rgba(42, 88, 67",
  "top: 656px",
  "rgba(0, 0, 0, 0) 54%",
  "radial-gradient(ellipse 190% 150%",
  "star-map",
  "assets/obsidian/stone-left",
  "assets/obsidian/stone-right",
  "The OS for growth engineers",
  "The operating system for growth engineers",
  "Infinite - The operating system for growth engineers",
  "Grow 10x faster with Infinite",
  "Unify your marketing analytics data and find more customers.",
  "The platform for growth engineers",
  "The all-in-one platform for financial advisers",
  "AI-powered practice management available now",
  "What we offer",
  "Who's it for",
  "Integrations",
  "Security",
  "Pricing",
  "About",
  "IvoryLLWeb-Light",
  "fonts/ivory/IvoryLLWeb-Light.woff2",
  "Save Time &amp; Grow AUM",
  "Made by the people behind",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
  "obsidianos.com/_astro",
  "MATRIX",
  "Matrix",
  "Create your company",
  "Download Matrix",
  "Agent Company",
  "Neo Intelligence",
  "Claude Code",
  "Codex",
  "BUILT-IN",
  "Growth analytics",
  "Command center",
  "Customer discovery",
  "Open source",
  "assets/infinite/infinite-command-center-dark",
  "assets/obsidian/favicon.png",
  "src=\"logo.png\"",
  "logo-mark",
  "assets/infinite/black-hole-logo-96.webp",
  "hero-rise",
  "hero-delay",
  "animation-delay",
  "opacity: 0;",
  "Download Now",
  "og-image.png",
  "twitter-card-v3.png",
  "black-hole-social-preview.jpg",
  "class=\"hero-background\" src=\"assets/infinite/black-hole-command-hero.png\"",
  "DM RTK for Access",
  "Get Access",
  "access-modal",
  "access-form",
  "Get access to Infinite",
  "name=\"name\"",
  "name=\"email\"",
  "Request Access",
  "data-open-access",
  "Secure request endpoint not connected yet.",
  "hero-subtitle",
  "We’ll email you when your invite is ready.",
  "access-description",
];

const requiredFiles = [
  "../assets/infinite/black-hole-command-hero-desktop.webp",
  "../assets/infinite/black-hole-command-hero-mobile.webp",
  "../assets/infinite/black-hole-social-preview.png",
  "../assets/infinite/black-hole-favicon-32.png",
  "../assets/infinite/black-hole-favicon-16.png",
  "../assets/obsidian/nav-ai-practice-management.webp",
  "../assets/obsidian/nav-custody-execution.webp",
  "../assets/obsidian/nav-independent-firms.webp",
  "../assets/obsidian/nav-consolidators.webp",
  "../fonts/ibm-plex/ibm-plex-sans-400.ttf",
  "../fonts/ibm-plex/ibm-plex-sans-500.ttf",
  "../fonts/ibm-plex/ibm-plex-sans-600.ttf",
  "../fonts/ibm-plex/ibm-plex-sans-700.ttf",
  "../fonts/ibm-plex/ibm-plex-mono-400.ttf",
  "../fonts/ibm-plex/ibm-plex-mono-500.ttf",
  "../fonts/ibm-plex/ibm-plex-mono-600.ttf",
];

const forbiddenFiles = [
  "../assets/infinite/black-hole-command-hero.png",
];

const failures = [];

for (const snippet of requiredSnippets) {
  if (!html.includes(snippet)) failures.push(`Missing required snippet: ${snippet}`);
}

for (const snippet of forbiddenSnippets) {
  if (html.includes(snippet)) failures.push(`Unexpected snippet present: ${snippet}`);
}

const headerCount = (html.match(/<header\b/g) || []).length;
const sectionCount = (html.match(/<section\b/g) || []).length;
if (headerCount !== 1) failures.push(`Expected exactly 1 header, found ${headerCount}`);
if (sectionCount !== 1) failures.push(`Expected exactly 1 section, found ${sectionCount}`);

const h1Rule = html.match(/h1\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";
if (!/font-weight:\s*400;/.test(h1Rule)) {
  failures.push("Expected h1 headline font-weight to be reduced to 400");
}

if (!/font-family:\s*var\(--heading\);/.test(h1Rule)) {
  failures.push("Expected h1 headline to use the live site IBM Plex Sans heading stack");
}

const builtInTitleRule = html.match(/\.built-in-title\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";
if (!/font-size:\s*11px;/.test(builtInTitleRule)) {
  failures.push("Expected AUTOMATE label font-size to be reduced to 11px");
}

const builtInItemRule = html.match(/\.built-in-item\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";
if (!/font-size:\s*13px;/.test(builtInItemRule)) {
  failures.push("Expected automate item labels font-size to be reduced to 13px");
}

if (!/font-weight:\s*500;/.test(builtInItemRule)) {
  failures.push("Expected automate item labels font-weight to be reduced to 500");
}

const logoRule = html.match(/\.logo\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";
if (!/font-weight:\s*400;/.test(logoRule)) {
  failures.push("Expected Infinite wordmark logo font-weight to be reduced to 400");
}

const navBlock = html.match(/<nav\b[\s\S]*?<\/nav>/)?.[0] ?? "";
for (const label of ["GitHub", "@infiniteOS_", "Discord"]) {
  if (!navBlock.includes(label)) failures.push(`Expected nav to include old footer item: ${label}`);
}

if (!navBlock.includes(">Book a demo call</button>")) failures.push("Expected nav to include a Book a demo call CTA button");

const ctaCount = (html.match(/>Book a demo call<\/button>/g) || []).length;
if (ctaCount < 2) failures.push(`Expected at least two Book a demo call CTA buttons, found ${ctaCount}`);

for (const label of ["Privacy", "Terms", "river", "Made with 🤖 by"]) {
  if (navBlock.includes(label)) failures.push(`Expected ${label} to move out of nav`);
}

const heroFooterBlock = html.match(/<div class="hero-footer"[\s\S]*?<\/div>/)?.[0] ?? "";
for (const label of ["Made with 🤖 by", "river", "Privacy", "Terms"]) {
  if (!heroFooterBlock.includes(label)) failures.push(`Expected hero footer overlay to include: ${label}`);
}

for (const file of requiredFiles) {
  try {
    await access(new URL(file, import.meta.url));
  } catch {
    failures.push(`Missing downloaded asset: ${file}`);
  }
}

for (const file of forbiddenFiles) {
  try {
    await access(new URL(file, import.meta.url));
    failures.push(`Unexpected heavyweight asset still present: ${file}`);
  } catch {
    // Expected: optimized hero variants replaced the original PNG.
  }
}

const sizeLimits = [
  ["../assets/infinite/black-hole-command-hero-desktop.webp", 420 * 1024],
  ["../assets/infinite/black-hole-command-hero-mobile.webp", 220 * 1024],
];

for (const [file, limit] of sizeLimits) {
  try {
    const { size } = await stat(new URL(file, import.meta.url));
    if (size > limit) {
      failures.push(`Optimized hero asset too large: ${file} is ${size} bytes, limit is ${limit}`);
    }
  } catch {
    failures.push(`Missing optimized hero asset for size check: ${file}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Infinite-branded nav + hero verification passed.");
