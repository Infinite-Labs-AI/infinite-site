import { access, readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const requiredSnippets = [
  "<header",
  "<nav",
  "The operating system for growth engineers",
  "Unify your marketing analytics data and find more customers.",
  "Download Now",
  "logo.png",
  "infinite",
  "GitHub",
  "@infiniteOS_",
  "Discord",
  "Privacy",
  "Terms",
  "Made with 🤖 by",
  "river",
  "assets/infinite/infinite-command-center-dark",
  "assets/infinite/space-horizon.webp",
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
];

const requiredFiles = [
  "../assets/infinite/infinite-command-center-dark.png",
  "../assets/infinite/infinite-command-center-dark-2x.png",
  "../assets/infinite/space-horizon.webp",
  "../assets/obsidian/nav-ai-practice-management.webp",
  "../assets/obsidian/nav-custody-execution.webp",
  "../assets/obsidian/nav-independent-firms.webp",
  "../assets/obsidian/nav-consolidators.webp",
  "../logo.png",
  "../fonts/ibm-plex/ibm-plex-sans-400.ttf",
  "../fonts/ibm-plex/ibm-plex-sans-500.ttf",
  "../fonts/ibm-plex/ibm-plex-sans-600.ttf",
  "../fonts/ibm-plex/ibm-plex-sans-700.ttf",
  "../fonts/ibm-plex/ibm-plex-mono-400.ttf",
  "../fonts/ibm-plex/ibm-plex-mono-500.ttf",
  "../fonts/ibm-plex/ibm-plex-mono-600.ttf",
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

const logoRule = html.match(/\.logo\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";
if (!/font-weight:\s*400;/.test(logoRule)) {
  failures.push("Expected Infinite wordmark logo font-weight to be reduced to 400");
}

const navBlock = html.match(/<nav\b[\s\S]*?<\/nav>/)?.[0] ?? "";
for (const label of ["GitHub", "@infiniteOS_", "Discord"]) {
  if (!navBlock.includes(label)) failures.push(`Expected nav to include old footer item: ${label}`);
}

if (!navBlock.includes(">Download Now</a>")) failures.push("Expected nav to include a Download Now CTA");

const downloadCount = (html.match(/>Download Now<\/a>/g) || []).length;
if (downloadCount < 2) failures.push(`Expected at least two Download Now CTAs, found ${downloadCount}`);

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

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Infinite-branded nav + hero verification passed.");
