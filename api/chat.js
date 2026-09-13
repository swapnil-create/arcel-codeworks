const TIER_MODELS = {
  fast: process.env.OPENROUTER_MODEL_FAST || "google/gemini-2.5-flash",
  balanced: process.env.OPENROUTER_MODEL_BALANCED || "anthropic/claude-sonnet-4",
  deep: process.env.OPENROUTER_MODEL_DEEP || "anthropic/claude-opus-4.1"
};

const COMPARE_MODELS = {
  arcel: TIER_MODELS.balanced,
  claude: process.env.OPENROUTER_MODEL_CLAUDE || "anthropic/claude-sonnet-4",
  gpt: process.env.OPENROUTER_MODEL_GPT || "~openai/gpt-latest",
  gemini: process.env.OPENROUTER_MODEL_GEMINI || "google/gemini-2.5-pro"
};

const MODE_INSTRUCTIONS = {
  Chat: "Be clear, direct, and useful. Use compact paragraphs and practical next steps.",
  Research: "Give a structured evidence-led answer. State uncertainty plainly and include source names or links when supplied in the prompt.",
  Code: "Act as a senior product engineer. Explain the implementation briefly, then provide safe, production-ready code when it helps."
};

const json = (res, status, body) => {
  res.status(status).json(body);
};

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(message => message && ["user", "assistant"].includes(message.role) && typeof message.content === "string")
    .slice(-24)
    .map(message => ({ role: message.role, content: message.content.slice(0, 12000) }));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return json(res, 503, {
      error: "OpenRouter is not configured.",
      code: "OPENROUTER_NOT_CONFIGURED"
    });
  }

  const messages = cleanMessages(req.body?.messages);
  if (!messages.length || !messages.some(message => message.role === "user")) {
    return json(res, 400, { error: "A user message is required." });
  }

  const tier = ["fast", "balanced", "deep"].includes(req.body?.tier) ? req.body.tier : "balanced";
  const requestedModel = typeof req.body?.model === "string" ? req.body.model : "arcel";
  const model = COMPARE_MODELS[requestedModel] || TIER_MODELS[tier];
  const mode = MODE_INSTRUCTIONS[req.body?.mode] ? req.body.mode : "Chat";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://arcel-codeworks.vercel.app",
        "X-OpenRouter-Title": "ARCEL Codeworks",
        "X-OpenRouter-Metadata": "enabled"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: `You are ARCEL Codeworks. ${MODE_INSTRUCTIONS[mode]}` }, ...messages],
        temperature: mode === "Code" ? 0.2 : 0.55,
        max_tokens: tier === "fast" ? 900 : tier === "deep" ? 2400 : 1400
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json(res, response.status, {
        error: payload?.error?.message || "OpenRouter could not complete this request.",
        code: "OPENROUTER_ERROR"
      });
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) return json(res, 502, { error: "The selected model returned no content.", code: "EMPTY_COMPLETION" });

    return json(res, 200, {
      content,
      model: payload.model || model,
      usage: payload.usage || null,
      provider: payload?.provider || null
    });
  } catch (error) {
    return json(res, 502, { error: "Unable to reach OpenRouter.", code: "OPENROUTER_UNREACHABLE" });
  }
};
