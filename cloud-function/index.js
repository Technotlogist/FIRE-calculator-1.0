// index.js (Google Cloud Function)
const { GoogleGenAI, Type } = require("@google/genai");
const fetch = require('node-fetch'); // Using node-fetch for HTTP requests

// Replace with your actual Salesforce API URL
const SALESFORCE_API_URL = "YOUR_SALESFORCE_TRANSACTIONAL_EMAIL_ENDPOINT"; 

// Initialize the Gemini AI client using the secure environment variable
// The GEMINI_API_KEY will be passed securely via GitHub Actions secrets
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);
 
// Define the required JSON output schema
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        subject: {
            type: Type.STRING,
            description: "A compelling and personalized email subject line."
        },
        body_html: {
            type: Type.STRING,
            description: "The full HTML body of the email (using <p>, <strong>, <ul>)."
        },
        strategy_summary: {
            type: Type.STRING,
            description: "A short, one-sentence summary of the main strategy for logging in Salesforce."
        }
    },
    required: ["subject", "body_html", "strategy_summary"]
};

// Main entry point for the Cloud Function (must match the Entry Point in the deployment settings)
exports.generateAndSendEmail = async (req, res) => {
    // Set CORS headers for the GitHub Pages frontend
    res.set('Access-Control-Allow-Origin', '*'); 

    if (req.method === 'OPTIONS') {
        // Handle CORS preflight request
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed. Must use POST.');
    }

    const userData = req.body;
    
    // Check for required data fields
    if (!userData.email || !userData.netWorth || !userData.thoughts) {
        return res.status(400).send('Missing required fields (email, netWorth, thoughts).');
    }

    // 2. Construct the Prompt 
    const prompt = `
        SYSTEM INSTRUCTION: You are a highly professional, motivational, and expert Financial Independence (FIRE) coach. Your goal is to analyze the user's raw financial data and their personal feelings to generate a personalized, actionable strategy email. The tone must be encouraging, positive, and authoritative.

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
        
        RETURN YOUR RESPONSE ONLY AS THE REQUESTED JSON OBJECT. DO NOT INCLUDE ANY OTHER TEXT.
    `;
    
    try {
        // 3. Call the Gemini API with Structured Output
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        // The response text is a JSON string, so we parse it
        const generatedContent = JSON.parse(response.text);
        
        // 4. Call Salesforce Marketing Cloud (Email Delivery) - Placeholder Logic
        // This is a placeholder; actual implementation requires Salesforce API details/tokens
        console.log(`Attempting to send email via Salesforce to: ${userData.email}`);
        
        /*
        await fetch(SALESFORCE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer YOUR_SALESFORCE_AUTH_TOKEN', 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: userData.email,
                subject: generatedContent.subject,
                body: generatedContent.body_html,
                // Include internal email copy here
            })
        });
        */

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
