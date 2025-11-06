// cloud-function/index.js
// Runtime: Node.js 20 (GCF gen2). CJS for simplicity.

const OpenAI = require("openai");

// Simple CORS helper
function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

// System prompt to anchor tone & scope
const SYSTEM = `You are an expert FIRE (Financial Independence, Retire Early) planner.
Be clear, data-driven, practical, and motivating. Tailor ideas to the user's inputs.`;

// Optional: request structured JSON when caller sets { structured: true }
const structuredSchema = {
  name: "FIREInsight",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      quickWins: { type: "array", items: { type: "string" } },
      estimatedFIRENumber: { type: "number" },
      targetDateRange: { type: "string" },
      actionsNext30Days: { type: "array", items: { type: "string" } }
    },
    required: ["summary", "quickWins"]
  }
};

exports.generateAndSendFirePlan = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).send("Only POST allowed");

  try {
    const { prompt, user } = req.body || {};
    // `user` can include income, savingsRate, expenses, age, balance, etc.
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing 'prompt' (string)" });
    }

    // Assemble a single input string for the Responses API.
    const preface = `System:\n${SYSTEM}\n\nUser Context (optional JSON):\n${JSON.stringify(user || {}, null, 2)}\n\nUser Question:\n${prompt}`;

    const wantsStructured = Boolean(req.body?.structured);

    const response = await client.responses.create({
      model: MODEL,
      input: preface,
      temperature: 0.7,
      // When structured JSON is requested, ask the model to emit valid JSON.
      ...(wantsStructured
        ? {
            response_format: {
              type: "json_schema",
              json_schema: structuredSchema
            },
            max_output_tokens: 1200
          }
        : { max_output_tokens: 800 })
    });

    const result = response.output_text; // Convenience field for the Responses API

    return res.status(200).json({
      ok: true,
      model: MODEL,
      structured: wantsStructured,
      result
    });
  } catch (err) {
    console.error("AI Error:", err);
    const status = err?.status || 500;
    return res.status(status).json({ ok: false, error: "Failed to generate insight" });
  }
};
// Dummy commit to trigger deployment
