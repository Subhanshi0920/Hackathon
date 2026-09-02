// Vercel serverless function served at /api/v1/chat/completions.
// Thin passthrough to OpenRouter that injects the API key server-side so it
// never reaches the browser. Request/response bodies are OpenRouter's own
// chat-completions shape.
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

  try {
    const upstream = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(req.body ?? {}),
      },
    );

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (err) {
    console.error("[api/v1/chat/completions] failed:", err);
    res.status(502).json({ error: "Upstream request failed", detail: String(err) });
  }
}
