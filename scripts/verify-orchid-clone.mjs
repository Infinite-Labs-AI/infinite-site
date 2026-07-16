import { access, readFile, stat } from "node:fs/promises";

const artifactPath = "../_agent_artifacts/orchid-clone/index.html";
const html = await readFile(new URL(artifactPath, import.meta.url), "utf8");

const requiredSnippets = [
  "<header",
  "<nav",
  "<main>",
  "<footer",
  "<title>Orchid, your personal assistant</title>",
  "property=\"og:title\" content=\"Orchid, your personal assistant\"",
  "property=\"og:image\" content=\"../../assets/orchid/branded/cta-twilight.webp\"",
  "Meet Orchid, your",
  "personal assistant.",
  "Orchid x World Cup",
  "ok i need aruba. like soon",
  "Connect with your stack.",
  "Automate your life using habits.",
  "Stay on top of admin.",
  "Never let anything slip through the cracks.",
  "Your second brain.",
  "Meet your new assistant.",
  "../../assets/orchid/branded/orchid-icon-3d.png",
  "../../assets/orchid/branded/aruba.webp",
  "../../assets/orchid/logos/providers/gmail.svg",
  "../../assets/orchid/branded/app-icons/mail.webp",
  "class=\"phone\"",
  "class=\"media-card\"",
  "class=\"mobile-panel\"",
];

const forbiddenSnippets = [
  "Matrix - Launch a 0-Person Company",
  "matrix-hero-rooftop",
  "assets/matrix/",
  "Obsidian - The all-in-one platform",
  "assets/obsidian/",
  "The growth agent for founders",
  "black-hole-command-hero",
  "Book a demo call",
];

const requiredFiles = [
  "../assets/orchid/branded/orchid-icon-3d.png",
  "../assets/orchid/branded/aruba.webp",
  "../assets/orchid/branded/aruba_party.webp",
  "../assets/orchid/branded/beach.jpeg",
  "../assets/orchid/branded/coffee-and-phones.webp",
  "../assets/orchid/branded/desk-orchid-night.webp",
  "../assets/orchid/branded/day-not-list-photo-01.webp",
  "../assets/orchid/branded/day-not-list-photo-02.webp",
  "../assets/orchid/branded/cta-twilight.webp",
  "../assets/orchid/branded/tartine.jpeg",
  "../assets/orchid/testimonials/maha.webp",
  "../assets/orchid/logos/providers/gmail.svg",
  "../assets/orchid/logos/providers/google-calendar.png",
  "../assets/orchid/logos/providers/slack.png",
  "../assets/orchid/logos/providers/hubspot.png",
  "../assets/orchid/logos/providers/notion.png",
  "../assets/orchid/logos/providers/dropbox.png",
  "../assets/orchid/logos/providers/figma.svg",
  "../assets/orchid/branded/app-icons/mail.webp",
  "../assets/orchid/branded/app-icons/calendar.webp",
  "../assets/orchid/branded/app-icons/phone.webp",
  "../assets/orchid/branded/app-icons/messages.webp",
];

const failures = [];

for (const snippet of requiredSnippets) {
  if (!html.includes(snippet)) failures.push(`Missing required snippet: ${snippet}`);
}

for (const snippet of forbiddenSnippets) {
  if (html.includes(snippet)) failures.push(`Unexpected old-site snippet present: ${snippet}`);
}

const sectionCount = (html.match(/<section\b/g) || []).length;
const featureCount = (html.match(/class="feature-row/g) || []).length;
const ctaCount = (html.match(/Get Started/g) || []).length;
const mediaCount = (html.match(/class="media-card/g) || []).length;

if (sectionCount < 4) failures.push(`Expected at least 4 sections, found ${sectionCount}`);
if (featureCount < 5) failures.push(`Expected at least 5 feature rows, found ${featureCount}`);
if (mediaCount < 5) failures.push(`Expected at least 5 media cards, found ${mediaCount}`);
if (ctaCount < 6) failures.push(`Expected at least 6 Get Started CTAs, found ${ctaCount}`);

if (!/font-size:\s*clamp\(52px,\s*5\.3vw,\s*76px\)/.test(html)) {
  failures.push("Expected Orchid-style large serif hero sizing");
}

if (!/--paper:\s*#f7f7f7;/.test(html)) {
  failures.push("Expected warm off-white Orchid paper token");
}

if (!/aspect-ratio:\s*0\.49;/.test(html)) {
  failures.push("Expected CSS phone mockup aspect ratio");
}

for (const file of requiredFiles) {
  try {
    await access(new URL(file, import.meta.url));
  } catch {
    failures.push(`Missing required asset: ${file}`);
  }
}

const fileSizeLimits = [
  [artifactPath, 70 * 1024],
  ["../assets/orchid/branded/coffee-and-phones.webp", 220 * 1024],
  ["../assets/orchid/branded/desk-orchid-night.webp", 180 * 1024],
  ["../assets/orchid/branded/day-not-list-photo-01.webp", 240 * 1024],
  ["../assets/orchid/branded/cta-twilight.webp", 260 * 1024],
];

for (const [file, limit] of fileSizeLimits) {
  const { size } = await stat(new URL(file, import.meta.url));
  if (size > limit) {
    failures.push(`File too large: ${file} is ${size} bytes, limit is ${limit}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Orchid static clone verification passed.");
