import { access, readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const requiredSnippets = [
  "<header",
  "<nav",
  "The all-in-one platform for financial advisers",
  "AI-powered practice management available now",
  "Get Started For Free",
  "assets/obsidian/home-hero",
  "assets/obsidian/stone-left",
  "assets/obsidian/stone-right",
  "fonts/ivory/IvoryLLWeb-Light.woff2",
  "fonts/inter/inter-latin-wght-normal.woff2",
];

const forbiddenSnippets = [
  "<footer",
  "Save Time &amp; Grow AUM",
  "Made by the people behind",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
  "obsidianos.com/_astro",
];

const requiredFiles = [
  "../assets/obsidian/home-hero.webp",
  "../assets/obsidian/home-hero-mobile.webp",
  "../assets/obsidian/stone-left.webp",
  "../assets/obsidian/stone-right.webp",
  "../assets/obsidian/nav-ai-practice-management.webp",
  "../assets/obsidian/nav-custody-execution.webp",
  "../assets/obsidian/nav-independent-firms.webp",
  "../assets/obsidian/nav-consolidators.webp",
  "../fonts/ivory/IvoryLLWeb-Light.woff2",
  "../fonts/inter/inter-latin-wght-normal.woff2",
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

console.log("Obsidian nav + hero clone verification passed.");
