// index.js (Google Cloud Function using OpenAI)

const OpenAI = require("openai");
const fetch = require('node-fetch');

// Replace with your actual Salesforce API URL
const SALESFORCE_API_URL = "YOUR_SALESFORCE_TRANSACTIONAL_EMAIL_ENDPOINT";

// Initialize the OpenAI client using the securely passed environment variable
// The client will automatically find process.env.OPENAI_API_KEY
const openai = new OpenAI({});

// Main entry point for the Cloud Function (must match the Entry Point in the deployment settings)
exports.generateAndSendEmail = async (req, res) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed. Must use POST.');
    }

    const userData = req.body;

    if (!userData.email || !userData.netWorth || !userData.thoughts) {
        return res.status(400).send('Missing required fields (email, netWorth, thoughts).');
    }

    // 2. Construct the Prompts
    const systemPrompt = `
You are a highly professional, motivational, and expert Financial Independence (FIRE) coach. Your goal is to analyze the user's financial data and personal feelings to generate a personalized, actionable strategy email. The tone must be encouraging, positive, and authoritative. You MUST return your response as a single, valid JSON object that adheres strictly to the structure: {"subject": "string", "body_html": "string", "strategy_summary": "string"}. DO NOT INCLUDE ANY OTHER TEXT.
`;

    const userPrompt = `
USER INPUT DATA:
- Current Net Worth: $${userData.netWorth}
- Annual Income: $${userData.income}
- Annual Expenses: $${userData.expenses}
- Savings Rate: ${userData.savingsRate}%
- FIRE Goal: $${userData.fireGoal}
- Years Until FIRE: ${userData.yearsToFire} Years

USER'S THOUGHTS/GOAL: "${userData.thoughts}"

TASK:
1. Craft an email subject and an HTML email body (using <p>, <strong>, and <ul> tags).
2. The email must start by directly referencing and validating the user's feeling about the timeline.
3. Propose 3 distinct, actionable strategies to reduce the ${userData.yearsToFire} year timeline, focused on either expense reduction or income/investment optimization.
4. Provide a single-sentence summary of the core strategy.
`;

    try {
        // 3. Call the OpenAI API with JSON response format
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Fast and effective for structured output
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" }, // Forces JSON output
        });

        // The response content is a JSON string, so we parse it
        const generatedContent = JSON.parse(response.choices[0].message.content);

        // ... (Salesforce placeholder logic) ...
        console.log(`Attempting to send email via Salesforce to: ${userData.email}`);

        // 5. Respond to the website
        res.status(200).send({
            message: "Plan generated and email sent successfully!",
            summary: generatedContent.strategy_summary
        });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).send('Failed to generate plan or send email.');
    }
};
// Dummy commit to trigger deployment
