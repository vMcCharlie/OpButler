import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { portfolio, userSettings } = await req.json();

        // Extract user threshold (default 1.1 if missing)
        const threshold = userSettings?.alert_threshold || 1.1;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not configured" },
                { status: 500 }
            );
        }

        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
      You are an autonomous Risk Agent for a DeFi user on BNB Chain.
      The user follows a "Good Vibes Only" philosophy: they want low stress, high safety, and optimized yields.

      **User Context:**
      - Total Net Worth: $${portfolio.totalNetWorth?.toFixed(2)}
      - Total Supplied: $${portfolio.totalSupplied?.toFixed(2)}
      - Total Borrowed: $${portfolio.totalBorrowed?.toFixed(2)}
      - Global Net APY: ${portfolio.globalNetAPY?.toFixed(2)}%
      - **User Alert Threshold:** Health Factor < ${threshold}
      
      **Protocol Health:**
      - Venus: HF ${portfolio.venus?.health?.toFixed(2)} (Supply: $${portfolio.venus?.supply?.toFixed(2)})
      - Kinza: HF ${portfolio.kinza?.health?.toFixed(2)} (Supply: $${portfolio.kinza?.supply?.toFixed(2)})
      - Radiant: HF ${portfolio.radiant?.health?.toFixed(2)} (Supply: $${portfolio.radiant?.supply?.toFixed(2)})

      **Detailed Positions:**
      ${JSON.stringify(portfolio.positions, null, 2)}

      **Task:**
      Analyze this portfolio and generate 3 short, actionable, "Good Vibes" tips.
      
      **Guidelines:**
      1. **Check Thresholds:** If any protocol Health Factor is below ${threshold + 0.1}, PRIORITIZE a warning and specific fix (e.g., "Repay BNB on Venus").
      2. **Optimize Yield:** If health is safe (>1.5), suggest ways to boost APY (e.g., "Loop USDT on Kinza").
      3. **Tone:** Professional but relaxed ("Good Vibes"). No doom-mongering unless liquidation is imminent.
      4. **Specifics:** Mention specific assets and protocols from the positions list.
      5. **Format:** JSON array of strings only. Example: ["Tip 1", "Tip 2", "Tip 3"].
      Do not include markdown formatting like \`\`\`json. Just the raw JSON array.
    `;

        const result = await ai.models.generateContent({
            model: "gemini-1.5-flash-001",
            contents: prompt,
        });

        const text = result.text || "[]";

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
