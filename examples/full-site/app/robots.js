const AI_BOTS = [
  "ClaudeBot",
  "GPTBot",
  "Google-Extended",
  "ChatGPT-User",
  "CCBot",
  "anthropic-ai",
  "Bytespider",
  "Diffbot",
  "FacebookBot",
  "Omgilibot",
  "Applebot-Extended",
];

export default async function robots() {
  const baseUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";

  // Read setting from DB — default to allowing AI bots
  let blockAiBots = false;
  try {
    const res = await fetch(
      `${baseUrl || "http://localhost:3000"}/api/settings/blockAiBots`,
      { next: { revalidate: 60 } },
    );
    if (res.ok) {
      const { data } = await res.json();
      blockAiBots = data === true;
    }
  } catch {
    // DB offline or setting not found — allow all
  }

  const rules = [
    { userAgent: "*", allow: "/" },
  ];

  if (blockAiBots) {
    for (const bot of AI_BOTS) {
      rules.push({ userAgent: bot, disallow: "/" });
    }
  }

  return {
    rules,
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
