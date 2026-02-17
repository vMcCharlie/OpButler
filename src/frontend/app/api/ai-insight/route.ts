import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { portfolio } = await req.json();

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not configured" },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
    You are an AI Risk Agent for a DeFi application called OpButler.
    Analyze the following user portfolio data:
    ${JSON.stringify(portfolio, null, 2)}

    Your goal is to provide "Good Vibes Only" risk management advice.
    Provide exactly 3 short, punchy, actionable tips. 
    Focus on reducing stress and keeping the user safe from liquidation.
    If the health factor is low (< 1.2), be urgent but supportive.
    If the health factor is high (> 1.5), be encouraging and suggest optimizing yield.
    
    Format the output as a JSON array of strings, e.g.:
    ["Tip 1", "Tip 2", "Tip 3"]
    Do not include markdown formatting like \`\`\`json. Just the raw JSON array.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown formatting if the model disregards instructions
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        return NextResponse.json({ tips: JSON.parse(cleanText) });
    } catch (error) {
        console.error("AI Insight Error:", error);
        return NextResponse.json(
            { error: "Failed to generate insights" },
            { status: 500 }
        );
    }
}
