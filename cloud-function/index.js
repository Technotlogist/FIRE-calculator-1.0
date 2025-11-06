// cloud-function/index.js
// Cloudflare Worker entry point. Uses ES Module syntax (export default).

import OpenAI from "openai";

// System prompt to anchor tone & scope (Kept from original)
const SYSTEM = `You are an expert FIRE (Financial Independence, Retire Early) planner.
Be clear, data-driven, practical, and motivating. Tailor ideas to the user's inputs.`;

// Optional: structured JSON schema (Kept from original)
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

export default {
    async fetch(request, env) {
        // Handle CORS preflight requests
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }
        
        // Only allow POST requests
        if (request.method !== "POST") {
            return new Response("Only POST allowed", { status: 405 });
        }

        try {
            // Cloudflare passes secrets/variables in the `env` object
            const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
            const MODEL = env.LLM_MODEL || "gpt-4o-mini";

            const body = await request.json();
            const { prompt, user } = body || {};

            if (!prompt || typeof prompt !== "string") {
                return new Response(JSON.stringify({ error: "Missing 'prompt' (string)" }), {
                    status: 400, 
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }

            // Assemble a single input string
            const preface = `System:\n${SYSTEM}\n\nUser Context (optional JSON):\n${JSON.stringify(user || {}, null, 2)}\n\nUser Question:\n${prompt}`;

            const wantsStructured = Boolean(body?.structured);

            const response = await client.responses.create({
                model: MODEL,
                input: preface,
                temperature: 0.7,
                // Use response_format for structured JSON if requested
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

            const result = response.output_text;

            return new Response(JSON.stringify({
                ok: true,
                model: MODEL,
                structured: wantsStructured,
                result
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
            });

        } catch (err) {
            console.error("AI Error:", err);
            return new Response(JSON.stringify({ ok: false, error: "Failed to generate insight" }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
    }
}
// Dummy commit to trigger deployment
