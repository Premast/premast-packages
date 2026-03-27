/**
 * Pure SEO analysis functions. No React, no side effects.
 * Each check returns { score: 0-1, label, status: "good"|"warning"|"poor" }
 */

function parseKeywords(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);
}

function extractTextFromBlocks(content) {
  if (!Array.isArray(content)) return "";
  const texts = [];
  for (const block of content) {
    const props = block.props || {};
    for (const val of Object.values(props)) {
      if (typeof val === "string" && val.length > 1 && val !== props.id) {
        // Strip HTML tags for rich text fields
        texts.push(val.replace(/<[^>]*>/g, " "));
      }
    }
  }
  return texts.join(" ").replace(/\s+/g, " ").trim();
}

function countWords(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function keywordDensity(text, keyword) {
  if (!text || !keyword) return 0;
  const lower = text.toLowerCase();
  const kw = keyword.toLowerCase();
  const matches = lower.split(kw).length - 1;
  const words = countWords(text);
  if (words === 0) return 0;
  const kwWords = countWords(kw);
  return (matches * kwWords) / words * 100;
}

function checkTitleLength(title) {
  const len = (title || "").length;
  if (len >= 50 && len <= 60) return { score: 1, status: "good", label: "Title length is optimal" };
  if ((len >= 30 && len < 50) || (len > 60 && len <= 70)) return { score: 0.5, status: "warning", label: `Title length: ${len} chars (aim for 50-60)` };
  return { score: 0, status: "poor", label: len === 0 ? "Meta title is missing" : `Title length: ${len} chars (aim for 50-60)` };
}

function checkDescriptionLength(desc) {
  const len = (desc || "").length;
  if (len >= 120 && len <= 160) return { score: 1, status: "good", label: "Description length is optimal" };
  if ((len >= 80 && len < 120) || (len > 160 && len <= 200)) return { score: 0.5, status: "warning", label: `Description: ${len} chars (aim for 120-160)` };
  return { score: 0, status: "poor", label: len === 0 ? "Meta description is missing" : `Description: ${len} chars (aim for 120-160)` };
}

function checkKeywordInTitle(title, keywords) {
  if (!keywords.length) return { score: 0.5, status: "warning", label: "No focus keyword set" };
  const lower = (title || "").toLowerCase();
  const found = keywords.some((kw) => lower.includes(kw));
  if (found) return { score: 1, status: "good", label: "Focus keyword found in title" };
  const partial = keywords.some((kw) => kw.split(" ").some((w) => lower.includes(w)));
  if (partial) return { score: 0.5, status: "warning", label: "Partial keyword match in title" };
  return { score: 0, status: "poor", label: "Focus keyword missing from title" };
}

function checkKeywordInDescription(desc, keywords) {
  if (!keywords.length) return { score: 0.5, status: "warning", label: "No focus keyword set" };
  const lower = (desc || "").toLowerCase();
  const found = keywords.some((kw) => lower.includes(kw));
  if (found) return { score: 1, status: "good", label: "Focus keyword found in description" };
  const partial = keywords.some((kw) => kw.split(" ").some((w) => lower.includes(w)));
  if (partial) return { score: 0.5, status: "warning", label: "Partial keyword match in description" };
  return { score: 0, status: "poor", label: "Focus keyword missing from description" };
}

function checkKeywordDensity(contentText, keywords) {
  if (!keywords.length) return { score: 0.5, status: "warning", label: "No focus keyword set" };
  if (!contentText) return { score: 0, status: "poor", label: "No page content to analyze" };
  const densities = keywords.map((kw) => keywordDensity(contentText, kw));
  const avg = densities.reduce((a, b) => a + b, 0) / densities.length;
  if (avg >= 1 && avg <= 3) return { score: 1, status: "good", label: `Keyword density: ${avg.toFixed(1)}% (optimal)` };
  if ((avg >= 0.5 && avg < 1) || (avg > 3 && avg <= 4)) return { score: 0.5, status: "warning", label: `Keyword density: ${avg.toFixed(1)}% (aim for 1-3%)` };
  return { score: 0, status: "poor", label: avg === 0 ? "Focus keyword not found in content" : `Keyword density: ${avg.toFixed(1)}% (aim for 1-3%)` };
}

function checkOgImage(ogImage) {
  if (ogImage && ogImage.trim()) return { score: 1, status: "good", label: "OG image is set" };
  return { score: 0, status: "poor", label: "OG image is missing" };
}

function checkContentLength(contentText) {
  const words = countWords(contentText);
  if (words >= 300) return { score: 1, status: "good", label: `Content: ${words} words` };
  if (words >= 150) return { score: 0.5, status: "warning", label: `Content: ${words} words (aim for 300+)` };
  return { score: 0, status: "poor", label: words === 0 ? "No page content" : `Content: ${words} words (aim for 300+)` };
}

function checkCanonicalUrl(url) {
  if (url && url.trim()) return { score: 1, status: "good", label: "Canonical URL is set" };
  return { score: 0, status: "poor", label: "Canonical URL is missing" };
}

function checkStructuredData(data) {
  if (!data || !data.trim()) return { score: 0, status: "poor", label: "No structured data" };
  try {
    JSON.parse(data);
    return { score: 1, status: "good", label: "Valid JSON-LD structured data" };
  } catch {
    return { score: 0, status: "poor", label: "Invalid JSON-LD (parse error)" };
  }
}

function checkKeywordsCoverage(contentText, keywords) {
  if (!keywords.length) return { score: 0.5, status: "warning", label: "No focus keywords set" };
  const lower = (contentText || "").toLowerCase();
  const found = keywords.filter((kw) => lower.includes(kw));
  const ratio = found.length / keywords.length;
  if (ratio === 1) return { score: 1, status: "good", label: `All ${keywords.length} keywords found in content` };
  if (ratio > 0) return { score: 0.5, status: "warning", label: `${found.length}/${keywords.length} keywords found in content` };
  return { score: 0, status: "poor", label: "No focus keywords found in content" };
}

const CHECKS = [
  { key: "keywordInTitle", weight: 15, fn: (r, kw) => checkKeywordInTitle(r.metaTitle, kw) },
  { key: "keywordInDesc", weight: 10, fn: (r, kw) => checkKeywordInDescription(r.metaDescription, kw) },
  { key: "titleLength", weight: 10, fn: (r) => checkTitleLength(r.metaTitle) },
  { key: "descLength", weight: 10, fn: (r) => checkDescriptionLength(r.metaDescription) },
  { key: "keywordDensity", weight: 15, fn: (r, kw, t) => checkKeywordDensity(t, kw) },
  { key: "ogImage", weight: 5, fn: (r) => checkOgImage(r.ogImage) },
  { key: "contentLength", weight: 10, fn: (r, kw, t) => checkContentLength(t) },
  { key: "canonicalUrl", weight: 5, fn: (r) => checkCanonicalUrl(r.canonicalUrl) },
  { key: "structuredData", weight: 5, fn: (r) => checkStructuredData(r.structuredData) },
  { key: "keywordsCoverage", weight: 15, fn: (r, kw, t) => checkKeywordsCoverage(t, kw) },
];

export function analyzeSeo(rootProps, contentBlocks) {
  const keywords = parseKeywords(rootProps.focusKeywords);
  const contentText = extractTextFromBlocks(contentBlocks);

  const results = CHECKS.map((check) => ({
    ...check,
    result: check.fn(rootProps, keywords, contentText),
  }));

  const totalScore = Math.round(
    results.reduce((sum, c) => sum + c.result.score * c.weight, 0),
  );

  return { totalScore, checks: results };
}
