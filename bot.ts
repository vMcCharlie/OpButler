
import { Bot, Context, InlineKeyboard } from "grammy";
import { StrategyManager } from "./index";
import { createWalletClient, createPublicClient, http, Address, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import "dotenv/config";

// --- Configuration & Security ---


// --- Configuration & Security ---
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// ALLOWED_USER_ID is now optional, used for Admin commands only if needed
const ADMIN_ID = process.env.ALLOWED_USER_ID ? parseInt(process.env.ALLOWED_USER_ID) : null;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!BOT_TOKEN) {
    console.error("❌ Error: TELEGRAM_BOT_TOKEN is required in .env");
    process.exit(1);
}

if (!PRIVATE_KEY || !PRIVATE_KEY.startsWith("0x") || PRIVATE_KEY.length !== 66) {
    console.error("❌ Error: Invalid PRIVATE_KEY. Must start with 0x and be 66 chars long.");
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Error: SUPABASE_URL and SUPABASE_KEY are required in .env");
    process.exit(1);
}

// --- Initialization ---
let manager: StrategyManager;
import { Account, PublicClient, WalletClient, Transport, Chain, verifyMessage, recoverMessageAddress } from "viem";
import { createClient } from '@supabase/supabase-js';

let account: Account;
let publicClient: PublicClient<Transport, Chain>;
let client: WalletClient<Transport, Chain, Account>;

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface UserData {
    chat_id: number;
    username?: string;
    wallet_address: Address;
    alert_threshold: number; // e.g. 1.1
}

try {
    account = privateKeyToAccount(PRIVATE_KEY);
    client = createWalletClient({
        account,
        chain: bsc,
        transport: http()
    });
    publicClient = createPublicClient({
        chain: bsc,
        transport: http()
    });
    manager = new StrategyManager(client, publicClient);
    console.log("✅ OpButler Core Initialized");
} catch (error: any) {
    console.error(`❌ Critical Initialization Error: ${error.message}`);
    process.exit(1);
}

// Initialize Bot
const bot = new Bot(BOT_TOKEN);

// --- Commands ---

bot.command("start", async (ctx) => {
    await ctx.reply(
        `🤖 **Welcome to OpButler!**\n\n` +
        `I can monitor your Venus Protocol positions and alert you of liquidation risks.\n\n` +
        `**To Get Started:**\n` +
        `1. Go to the OpButler Dashboard > Settings\n` +
        `2. Enter your Telegram ID: \`${ctx.from?.id}\`\n` +
        `3. Sign the authentication message with your wallet.\n` +
        `4. Paste the signature here using:\n` +
        `\`/verify <signature>\``,
        { parse_mode: "Markdown" }
    );
});

bot.command("id", (ctx) => {
    ctx.reply(`Your User ID is: \`${ctx.from?.id}\``, { parse_mode: "Markdown" });
});

bot.command("verify", async (ctx) => {
    const signature = ctx.match;
    if (!signature) {
        return ctx.reply("❌ Please provide the signature.\nUsage: `/verify <signature>`", { parse_mode: "Markdown" });
    }

    const chatId = ctx.from?.id;
    if (!chatId) return;

    try {
        const message = `OpButler Auth: ${chatId}`;

        // Correct way to recover address from signature using viem
        const recoveredAddress = await recoverMessageAddress({
            message,
            signature: signature as `0x${string}`
        });

        // Upsert User into Supabase
        const { error } = await supabase
            .from('users')
            .upsert({
                chat_id: chatId,
                username: ctx.from?.username,
                wallet_address: recoveredAddress,
                alert_threshold: 1.1
            }, {
                onConflict: 'chat_id'
            });

        if (error) {
            console.error('Supabase Error:', error);
            throw new Error('Database error');
        }

        await ctx.reply(
            `✅ **Success!**\n\n` +
            `Linked Wallet: \`${recoveredAddress}\`\n` +
            `You will now receive alerts if your Health Factor drops below **1.1**.\n\n` +
            `Try \`/risk\` to check your status.`,
            { parse_mode: "Markdown" }
        );

    } catch (error) {
        console.error("Verification failed:", error);
        await ctx.reply("❌ Verification failed. Invalid signature or database error.");
    }
});

bot.command("risk", async (ctx) => {
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('chat_id', ctx.from?.id)
        .single();

    if (error || !user) {
        return ctx.reply("⚠️ You have not linked a wallet yet. Use `/start` to begin.");
    }

    await ctx.reply("🔍 Checking Health Factor...");
    try {
        const health = await manager.getAccountHealth(user.wallet_address as Address);

        let status = "Unknown";
        if (health.healthFactor > 2) status = "🟢 Safe";
        else if (health.healthFactor > 1.1) status = "🟡 Warning";
        else status = "🔴 CRITICAL";

        let message = `📊 **Risk Report**\n\n` +
            `Wallet: \`${user.wallet_address.substring(0, 6)}...${user.wallet_address.substring(38)}\`\n` +
            `Health Factor: **${health.healthFactor.toFixed(2)}**\n` +
            `Status: ${status}\n\n`;

        // Add position details if available
        if (health.totalCollateralUSD > 0 || health.totalDebtUSD > 0) {
            message += `💰 **Position:**\n` +
                `• Collateral: $${health.totalCollateralUSD.toLocaleString()}\n` +
                `• Debt: $${health.totalDebtUSD.toLocaleString()}\n\n`;
        }

        // Add suggestions if HF is low
        if (health.suggestions) {
            message += `💡 **Suggestions to reach HF ${health.suggestions.targetHF}:**\n`;
            if (health.suggestions.repayAmount > 0) {
                message += `• Repay ~$${health.suggestions.repayAmount.toLocaleString()} debt\n`;
            }
            if (health.suggestions.addCollateralAmount > 0) {
                message += `• Add ~$${health.suggestions.addCollateralAmount.toLocaleString()} collateral\n`;
            }
        }

        await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (e: any) {
        await ctx.reply(`Error fetching data: ${e.message}`);
    }
});

bot.command("status", async (ctx) => {
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('chat_id', ctx.from?.id)
        .single();

    if (user) {
        await ctx.reply(
            `👤 **Account Status**\n\n` +
            `Linked Wallet: \`${user.wallet_address}\`\n` +
            `Alert Threshold: HF < ${user.alert_threshold}`,
            { parse_mode: "Markdown" }
        );
    } else {
        await ctx.reply("❌ No wallet linked.");
    }
});

// --- Background Job: Monitor Risk ---
setInterval(async () => {
    // Fetch all users
    const { data: users, error } = await supabase
        .from('users')
        .select('*');

    if (error) {
        console.error("Error fetching users for monitoring:", error);
        return;
    }

    console.log(`🔍 Monitoring ${users.length} users...`);

    for (const user of users) {
        try {
            const health = await manager.getAccountHealth(user.wallet_address as Address);

            if (health.healthFactor < user.alert_threshold) {
                // Build alert message with suggestions
                let alertMessage = `🚨 **LIQUIDATION ALERT** 🚨\n\n` +
                    `Your Health Factor has dropped to **${health.healthFactor.toFixed(2)}**!\n` +
                    `Alert Threshold: ${user.alert_threshold}\n\n`;

                // Add position details if available
                if (health.totalCollateralUSD > 0 || health.totalDebtUSD > 0) {
                    alertMessage += `📊 **Position Summary:**\n` +
                        `• Collateral: $${health.totalCollateralUSD.toLocaleString()}\n` +
                        `• Debt: $${health.totalDebtUSD.toLocaleString()}\n\n`;
                }

                // Add actionable suggestions
                if (health.suggestions) {
                    alertMessage += `💡 **To reach a safe HF of ${health.suggestions.targetHF}:**\n`;

                    if (health.suggestions.repayAmount > 0) {
                        alertMessage += `• **Option A:** Repay ~$${health.suggestions.repayAmount.toLocaleString()} of debt\n`;
                    }
                    if (health.suggestions.addCollateralAmount > 0) {
                        alertMessage += `• **Option B:** Add ~$${health.suggestions.addCollateralAmount.toLocaleString()} collateral\n`;
                    }
                    alertMessage += `\n`;
                }

                alertMessage += `⚠️ Act now to avoid liquidation!\n\n` +
                    `👉 [Open OpButler Dashboard](https://opbutler.vercel.app/dashboard)`;

                // Send Alert
                await bot.api.sendMessage(user.chat_id, alertMessage, { parse_mode: "Markdown" });
            }
        } catch (e) {
            console.error(`Error monitoring user ${user.chat_id}:`, e);
        }
    }
}, 60 * 1000 * 5); // Check every 5 minutes

// Start Bot
bot.catch((err) => {
    console.error("Bot Error:", err);
});

bot.start();
console.log("🤖 OpButler Telegram Bot (Supabase) Started!");
