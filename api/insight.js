// Vercel serverless function. Proxies the credit-insight request to OpenRouter
// so the API key stays server-side and the browser talks same-origin (no CORS).
const PROMPT =
  "You are a credit underwriting assistant for a bank's SME lending desk. Given this SME's GST filing and cash-flow data, return ONLY a JSON object (no markdown, no preamble) with keys: score (integer 0-100, creditworthiness), band (a 2-4 word label like 'Healthy — Fundable'), narrative (2-3 plain-English sentences explaining the score for a loan officer, referencing the specific data). Data: ";

// Free models are individually flaky (429 / empty output). List a few so
// OpenRouter falls through to whichever is up.
// ponytail: static list, revisit if these slugs get retired
const MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "z-ai/glm-5.2:free",
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    res.status(500).json({ error: "OPENROUTER_API_KEY not configured" });
    return;
  }

  const metrics = req.body?.metrics ?? req.body;
  const body = JSON.stringify({
    model: MODELS[0],
    models: MODELS,
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: PROMPT + JSON.stringify(metrics) }],
  });

  try {
    // Free models get rate-limited upstream; retry a couple of times.
    let upstream, raw;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 1500));
      upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body,
      });
      raw = await upstream.text();
      if (upstream.status !== 429) break;
    }
    if (!upstream.ok) {
      console.error("[api/insight] openrouter", upstream.status, raw);
      res.status(502).json({ error: `OpenRouter ${upstream.status}`, detail: raw.slice(0, 500) });
      return;
    }

    const data = JSON.parse(raw.slice(raw.indexOf("{")));
    const text = data.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("[api/insight] no JSON in model output:", JSON.stringify(data).slice(0, 800));
      res.status(502).json({ error: "Model returned no JSON", detail: text.slice(0, 500) });
      return;
    }
    res.status(200).json(JSON.parse(match[0]));
  } catch (err) {
    console.error("[api/insight] failed:", err);
    res.status(502).json({ error: "Upstream request failed", detail: String(err) });
  }
}
