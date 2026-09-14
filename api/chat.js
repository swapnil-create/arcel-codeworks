const crypto = require("crypto");
const { generationGate, attachErrorMeta } = require("../lib/generation-errors");
const { readSession } = require("../lib/session");

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

function newRequestId() {
  return `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

const json = (res, status, body) => {
  const request_id = body.request_id || newRequestId();
  const payload = body.code
    ? attachErrorMeta({ ...body, request_id }, status)
    : { ...body, request_id };
  res.status(status).json(payload);
};

function validateMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) {
    return { error: "At least one message is required.", code: "INVALID_INPUT" };
  }
  if (messages.length > 24) {
    return {
      error: "This conversation exceeds the current 24-message context limit. Context compaction is not available yet.",
      code: "CONTEXT_LIMIT"
    };
  }

  for (const message of messages) {
    if (!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string") {
      return { error: "Messages must contain a user or assistant role and text content.", code: "INVALID_INPUT" };
    }
    if (message.content.length > 12000) {
      return { error: "A message exceeds the current 12,000-character input limit.", code: "CONTEXT_LIMIT" };
    }
  }
  return { messages };
}

function writeStreamEvent(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function proxyStream(response, res) {
  const reader = response.body?.getReader?.();
  if (!reader) throw new Error("The provider did not return a readable stream.");

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let usage = null;
  let provider = null;

  const consumeLine = (line) => {
    if (!line.startsWith("data:")) return false;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return false;

    let chunk;
    try {
      chunk = JSON.parse(data);
    } catch {
      return false;
    }

    const delta = chunk?.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta) {
      content += delta;
      writeStreamEvent(res, { type: "delta", delta });
    }
    if (chunk?.usage) usage = chunk.usage;
    if (chunk?.provider) provider = chunk.provider;
    return true;
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = done ? "" : lines.pop();
    for (const line of lines) consumeLine(line);
    if (done) break;
  }
  if (buffer) consumeLine(buffer);

  if (!content) {
    writeStreamEvent(res, {
      type: "error",
      error: "The selected model returned no content.",
      code: "EMPTY_COMPLETION"
    });
  } else {
    writeStreamEvent(res, { type: "done", content, usage, provider });
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed", code: "INVALID_INPUT" });
  }

  // Actor is derived from the signed session cookie only. Body fields such as
  // display_name / user / Authorization headers are not identity.
  const session = readSession(req, process.env);
  const gate = generationGate(process.env, session);
  if (gate) return json(res, gate.status, { error: gate.error, code: gate.code });

  const messageResult = validateMessages(req.body?.messages);
  if (messageResult.error) return json(res, messageResult.code === "CONTEXT_LIMIT" ? 413 : 400, messageResult);
  const messages = messageResult.messages;
  if (!messages.some(message => message.role === "user")) {
    return json(res, 400, { error: "A user message is required.", code: "INVALID_INPUT" });
  }

  const tier = ["fast", "balanced", "deep"].includes(req.body?.tier) ? req.body.tier : "balanced";
  const requestedModel = typeof req.body?.model === "string" ? req.body.model : "arcel";
  if (requestedModel !== "arcel" && !Object.hasOwn(COMPARE_MODELS, requestedModel)) {
    return json(res, 400, { error: "This model is not available in the current catalog.", code: "UNSUPPORTED_CAPABILITY" });
  }
  const model = requestedModel === "arcel" ? TIER_MODELS[tier] : COMPARE_MODELS[requestedModel];
  const mode = MODE_INSTRUCTIONS[req.body?.mode] ? req.body.mode : "Chat";
  const wantsStream = req.body?.stream === true;

  try {
    const upstreamAbort = new AbortController();
    // Stop provider work when the browser disconnects. The optional guard keeps
    // the handler compatible with the lightweight local test response object.
    req.on?.("close", () => upstreamAbort.abort());
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: upstreamAbort.signal,
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
        max_tokens: tier === "fast" ? 900 : tier === "deep" ? 2400 : 1400,
        ...(wantsStream ? { stream: true, stream_options: { include_usage: true } } : {})
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      return json(res, response.status, {
        error: payload?.error?.message || "OpenRouter could not complete this request.",
        code: "OPENROUTER_ERROR"
      });
    }

    if (wantsStream) {
      const request_id = newRequestId();
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      writeStreamEvent(res, { type: "start", request_id, model: response.headers?.get?.("x-openrouter-model") || model });
      try {
        await proxyStream(response, res);
      } catch (error) {
        if (!upstreamAbort.signal.aborted) {
          writeStreamEvent(res, { type: "error", error: "The live response was interrupted.", code: "OPENROUTER_UNREACHABLE" });
        }
      }
      return res.end();
    }

    const payload = await response.json().catch(() => ({}));

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

module.exports.generationGate = generationGate;
