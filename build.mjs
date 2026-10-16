// Answer Bar industry feeds.
// Reads industries.json, pulls each source's RSS or Atom feed, keeps items about AI and work,
// merges them with what was published last time, and writes docs/<industry>.json for the
// industry pages on answerbar.io to read. Runs on a schedule in GitHub Actions.
//
// Usage: node build.mjs
// Test:  FIXTURE_DIR=./fixtures node build.mjs   (reads <fixture>/<slug>.xml instead of the web)

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT_DIR = path.join(ROOT, "docs");
const FIXTURE_DIR = process.env.FIXTURE_DIR ? path.resolve(process.env.FIXTURE_DIR) : null;
const NOW = process.env.NOW ? new Date(process.env.NOW) : new Date();
const USER_AGENT = "AnswerBarIndustryFeeds/1.0 (+https://www.answerbar.io)";

// Whole-word matching, so "ai" does not match "said" or "maintain".
const TERMS = {
  ai: /\b(ai|a\.i\.|artificial intelligence|generative|genai|gen ai|chatgpt|llms?|large language models?|machine learning|chatbots?|copilot|automation)\b/i,
  work: /\b(workers?|workforce|workplace|jobs?|employ\w*|careers?|consult\w*|coach\w*|advis\w*|freelanc\w*|self-employed|small business\w*|professional services|labou?r market)\b/i
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function decode(s) {
  return String(s ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Plain text: no tags, straight quotes, and no em or en dashes on the page.
function clean(s) {
  return decode(decode(s))
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s*[\u2013\u2014]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(text, max = 220) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sentence = cut.lastIndexOf(". ");
  if (sentence > 80) return cut.slice(0, sentence + 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "") + "...";
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : null;
}

function parseFeed(xml) {
  const items = [];
  for (const block of xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []) {
    items.push({
      title: clean(tag(block, "title")),
      link: clean(tag(block, "link")),
      date: tag(block, "pubDate") ?? tag(block, "dc:date"),
      summary: clean(tag(block, "description") ?? "")
    });
  }
  for (const block of xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []) {
    const href = block.match(/<link\b[^>]*href="([^"]+)"/i);
    items.push({
      title: clean(tag(block, "title")),
      link: href ? decode(href[1]) : "",
      date: tag(block, "published") ?? tag(block, "updated"),
      summary: clean(tag(block, "summary") ?? tag(block, "content") ?? "")
    });
  }
  return items;
}

async function loadFeed(source) {
  if (FIXTURE_DIR) return readFile(path.join(FIXTURE_DIR, `${slug(source.name)}.xml`), "utf8");
  const res = await fetch(source.feed, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// "feeds.hbr.org" and "hbr.org" are the same site; so are "managers.org.uk" and "www.managers.org.uk".
function siteOf(url) {
  const parts = new URL(url).hostname.split(".");
  const n = /^(co|org|ac|gov)$/.test(parts.at(-2)) && parts.at(-1).length === 2 ? 3 : 2;
  return parts.slice(-n).join(".");
}

function keep(item, source, cutoff) {
  if (!item.title || !/^https:\/\//.test(item.link)) return false;
  const when = new Date(item.date);
  if (Number.isNaN(when.getTime()) || when < cutoff || when > new Date(NOW.getTime() + 864e5)) return false;
  // Links must stay on the outlet that published them (no redirects through third parties).
  if (siteOf(source.feed) !== siteOf(item.link)) return false;
  const text = `${item.title} ${item.summary}`;
  return source.require.every((t) => TERMS[t].test(text));
}

async function buildIndustry(industry, settings) {
  const outFile = path.join(OUT_DIR, `${industry.key}.json`);
  const previous = existsSync(outFile) ? JSON.parse(await readFile(outFile, "utf8")) : null;
  const cutoff = new Date(NOW.getTime() - settings.keepDays * 864e5);
  const report = [];
  const byColumn = Object.fromEntries(industry.columns.map((c) => [c.key, []]));

  // Start from what was published last time, so a feed that is down does not empty a column.
  for (const col of previous?.columns ?? []) {
    if (!byColumn[col.key]) continue;
    for (const it of col.items) if (new Date(it.published_at) >= cutoff) byColumn[col.key].push(it);
  }

  for (const source of industry.sources) {
    try {
      const items = parseFeed(await loadFeed(source)).filter((i) => keep(i, source, cutoff));
      for (const i of items) {
        byColumn[source.column].push({
          headline: i.title,
          summary: shorten(i.summary || i.title),
          source_name: source.name,
          source_url: i.link,
          published_at: new Date(i.date).toISOString()
        });
      }
      report.push({ source: source.name, ok: true, kept: items.length });
    } catch (err) {
      report.push({ source: source.name, ok: false, error: String(err.message ?? err) });
    }
  }

  const columns = industry.columns.map((c) => {
    const seen = new Set();
    const items = byColumn[c.key]
      .filter((i) => (seen.has(i.source_url) ? false : seen.add(i.source_url)))
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      .slice(0, settings.maxItemsPerColumn);
    return { key: c.key, label: c.label, items };
  });

  const changed = JSON.stringify(columns) !== JSON.stringify(previous?.columns);
  const out = {
    industry: industry.key,
    title: industry.title,
    updated_at: changed || !previous ? NOW.toISOString() : previous.updated_at,
    columns,
    sources: report
  };
  await writeFile(outFile, JSON.stringify(out, null, 2) + "\n");
  return { industry: industry.key, changed, report, counts: columns.map((c) => `${c.label}: ${c.items.length}`) };
}

const config = JSON.parse(await readFile(path.join(ROOT, "industries.json"), "utf8"));
await mkdir(OUT_DIR, { recursive: true });
for (const industry of config.industries) {
  const result = await buildIndustry(industry, config);
  console.log(JSON.stringify(result, null, 2));
}
