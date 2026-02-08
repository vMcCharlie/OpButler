
import { Bot, Context, InlineKeyboard } from "grammy";
import { StrategyManager } from "./index";
import { createWalletClient, createPublicClient, http, Address, formatEther, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import "dotenv/config";

// --- Configuration & Security ---
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.ALLOWED_USER_ID ? parseInt(process.env.ALLOWED_USER_ID) : null;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://opbutler.vercel.app";

// Polling intervals in minutes
const VALID_INTERVALS = [60, 120, 360, 720, 960, 1440];
const INTERVAL_LABELS: Record<number, string> = {
    60: "1 hour",
    120: "2 hours",
    360: "6 hours",
    720: "12 hours",
    960: "16 hours",
    1440: "24 hours"
};

if (!BOT_TOKEN) {
    console.error("❌ Error: TELEGRAM_BOT_TOKEN is required in .env");
    process.exit(1);
}

// PRIVATE_KEY is now optional - needed only for bot-initiated transactions (not currently used)
if (PRIVATE_KEY && (!PRIVATE_KEY.startsWith("0x") || PRIVATE_KEY.length !== 66)) {
    console.warn("⚠️ Warning: Invalid PRIVATE_KEY format. Bot will run in read-only mode.");
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Error: SUPABASE_URL and SUPABASE_KEY are required in .env");
    process.exit(1);
}

// --- Initialization ---
let manager: StrategyManager;
import { Account, PublicClient, WalletClient, Transport, Chain, recoverMessageAddress } from "viem";
import { createClient } from '@supabase/supabase-js';

let account: Account;
let publicClient: PublicClient<Transport, Chain>;
let client: WalletClient<Transport, Chain, Account>;

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface UserData {
    id: string;
    chat_id: number;
    username?: string;
    wallet_address: string;
    alert_threshold: number;
    polling_interval: number;
    last_checked: string;
    alerts_enabled: boolean;
}

try {
    publicClient = createPublicClient({
        chain: bsc,
        transport: http()
    });

    if (PRIVATE_KEY && PRIVATE_KEY.startsWith("0x") && PRIVATE_KEY.length === 66) {
        account = privateKeyToAccount(PRIVATE_KEY);
        client = createWalletClient({
            account,
            chain: bsc,
            transport: http()
        });
        manager = new StrategyManager(publicClient, client);
        console.log("✅ OpButler Core Initialized (Full Access)");
    } else {
        manager = new StrategyManager(publicClient);
        console.log("ℹ️ OpButler Core Initialized (Read-Only Mode)");
    }
    console.log("✅ OpButler Core Initialized");
} catch (error: any) {
    console.error(`❌ Critical Initialization Error: ${error.message}`);
    process.exit(1);
}

// Initialize Bot
const bot = new Bot(BOT_TOKEN);

// --- Helper Functions ---
function formatUSD(value: number): string {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatHF(hf: number): string {
    return hf >= 999 ? "∞" : hf.toFixed(2);
}

function getUtilization(collateral: number, debt: number): number {
    if (collateral === 0) return 0;
    return (debt / collateral) * 100;
}

// --- Commands ---

bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard()
        .url("Open Dashboard", `${DASHBOARD_URL}/settings`);

    await ctx.reply(
        `🤖 **Welcome to OpButler!**\n\n` +
        `I provide **24/7 automated monitoring** for your DeFi positions on Venus, Kinza, and Radiant.\n\n` +
        `**Commands:**\n` +
        `• /settings - View/update alert settings\n` +
        `• /setinterval - Change polling frequency\n` +
        `• /id - Get your Telegram User ID\n\n` +
        `**Setup:**\n` +
        `1. Open Dashboard > Settings\n` +
        `2. Enter your Telegram ID: \`${ctx.from?.id}\`\n` +
        `3. Sign the message & verify with:\n` +
        `\`/verify <signature>\``,
        { parse_mode: "Markdown", reply_markup: keyboard }
    );
});

bot.command("id", (ctx) => {
    ctx.reply(`Your Telegram ID is: \`${ctx.from?.id}\`\n\nUse this when linking your wallet on the dashboard.`, { parse_mode: "Markdown" });
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
        const recoveredAddress = await recoverMessageAddress({
            message,
            signature: signature as `0x${string}`
        });

        // Upsert User into Supabase with default settings
        const { error } = await supabase
            .from('users')
            .upsert({
                chat_id: chatId,
                username: ctx.from?.username,
                wallet_address: recoveredAddress.toLowerCase(),
                alert_threshold: 1.1,
                polling_interval: 60, // Default: 1 hour
                alerts_enabled: true,
                last_checked: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'chat_id'
            });

        if (error) {
            console.error('Supabase Error:', error);
            throw new Error('Database error');
        }

        await ctx.reply(
            `✅ **Wallet Linked Successfully!**\n\n` +
            `🔗 Wallet: \`${recoveredAddress}\`\n` +
            `⏰ Polling: Every 1 hour\n` +
            `⚠️ Alert when HF < 1.1\n\n` +
            `I am now monitoring your positions 24/7!`,
            { parse_mode: "Markdown" }
        );

    } catch (error) {
        console.error("Verification failed:", error);
        await ctx.reply("❌ Verification failed. Invalid signature or database error.");
    }
});

// --- Commands Removed as per requirement (/positions, /risk) ---

// /settings - View current settings
bot.command("settings", async (ctx) => {
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('chat_id', ctx.from?.id)
        .single();

    if (!user) {
        return ctx.reply("❌ No wallet linked. Use `/start` to begin.", { parse_mode: "Markdown" });
    }

    const intervalLabel = INTERVAL_LABELS[user.polling_interval] || `${user.polling_interval} min`;

    await ctx.reply(
        `⚙️ **Your Settings**\n\n` +
        `🔗 Wallet: \`${user.wallet_address}\`\n` +
        `⏰ Polling Interval: **${intervalLabel}**\n` +
        `⚠️ Alert Threshold: HF < **${user.alert_threshold}**\n` +
        `🔔 Alerts: ${user.alerts_enabled ? "✅ Enabled" : "❌ Disabled"}\n\n` +
        `**Commands:**\n` +
        `• /setinterval - Change polling frequency\n` +
        `• /setalert <value> - Change HF threshold\n` +
        `• /togglealerts - Enable/disable alerts`,
        { parse_mode: "Markdown" }
    );
});

// /setinterval - Change polling interval with inline keyboard
bot.command("setinterval", async (ctx) => {
    const keyboard = new InlineKeyboard()
        .text("1 hour", "interval_60").text("2 hours", "interval_120").row()
        .text("6 hours", "interval_360").text("12 hours", "interval_720").row()
        .text("16 hours", "interval_960").text("24 hours", "interval_1440");

    await ctx.reply(
        "⏰ **Select Polling Interval**\n\n" +
        "How often should I check your positions?",
        { parse_mode: "Markdown", reply_markup: keyboard }
    );
});

// Handle interval selection callbacks
bot.callbackQuery(/^interval_(\d+)$/, async (ctx) => {
    const interval = parseInt(ctx.match![1]);

    if (!VALID_INTERVALS.includes(interval)) {
        return ctx.answerCallbackQuery({ text: "Invalid interval", show_alert: true });
    }

    const { error } = await supabase
        .from('users')
        .update({
            polling_interval: interval,
            updated_at: new Date().toISOString()
        })
        .eq('chat_id', ctx.from.id);

    if (error) {
        return ctx.answerCallbackQuery({ text: "Failed to update", show_alert: true });
    }

    await ctx.answerCallbackQuery({ text: `Updated to ${INTERVAL_LABELS[interval]}` });
    await ctx.editMessageText(
        `✅ **Polling Interval Updated**\n\n` +
        `Your positions will now be checked every **${INTERVAL_LABELS[interval]}**.`,
        { parse_mode: "Markdown" }
    );
});

// /setalert - Set alert threshold
bot.command("setalert", async (ctx) => {
    const value = parseFloat(ctx.match);

    if (isNaN(value) || value < 1.0 || value > 2.0) {
        return ctx.reply(
            "⚠️ Please provide a valid threshold between 1.0 and 2.0.\n\n" +
            "Example: `/setalert 1.2`",
            { parse_mode: "Markdown" }
        );
    }

    const { error } = await supabase
        .from('users')
        .update({
            alert_threshold: value,
            updated_at: new Date().toISOString()
        })
        .eq('chat_id', ctx.from?.id);

    if (error) {
        return ctx.reply("❌ Failed to update threshold.");
    }

    await ctx.reply(`✅ Alert threshold set to HF < **${value}**`, { parse_mode: "Markdown" });
});

// /togglealerts - Enable/disable alerts
bot.command("togglealerts", async (ctx) => {
    const { data: user } = await supabase
        .from('users')
        .select('alerts_enabled')
        .eq('chat_id', ctx.from?.id)
        .single();

    if (!user) {
        return ctx.reply("❌ No wallet linked.");
    }

    const newState = !user.alerts_enabled;

    await supabase
        .from('users')
        .update({
            alerts_enabled: newState,
            updated_at: new Date().toISOString()
        })
        .eq('chat_id', ctx.from?.id);

    await ctx.reply(
        newState
            ? "🔔 **Alerts Enabled**\nYou will receive liquidation warnings."
            : "🔕 **Alerts Disabled**\nYou won't receive automatic alerts.",
        { parse_mode: "Markdown" }
    );
});

// /status - Account status (alias for settings)
bot.command("status", async (ctx) => {
    return ctx.reply("Use /settings to view your account status and alert configuration.");
});

// --- Catch-all Handler for Invalid Commands/Messages ---
bot.on("message", async (ctx) => {
    await ctx.reply(
        "🤔 **I don't recognize that command or message.**\n\n" +
        "My goal is to monitor your DeFi positions and alert you if your Health Factor drops.\n\n" +
        "Type /start to see available commands or link your wallet.",
        { parse_mode: "Markdown" }
    );
});

// --- Smart Polling Background Job ---
// Runs every 5 seconds to ensure high responsiveness
const POLLING_CHECK_INTERVAL = 5 * 1000; // Fast 5s heartbeat

setInterval(async () => {
    const now = new Date();

    // Fetch users who need to be checked
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('alerts_enabled', true);

    if (error || !users) {
        console.error("Error fetching users:", error);
        return;
    }

    const checkResults = await Promise.allSettled(users.map(async (user) => {
        // Calculate if it's time to check this user
        const lastChecked = new Date(user.last_checked);
        const intervalMs = user.polling_interval * 60 * 1000;
        const timeSinceLastCheck = now.getTime() - lastChecked.getTime();

        if (timeSinceLastCheck < intervalMs) {
            return false; // Not time to check yet
        }

        try {
            const health = await manager.getAccountHealth(user.wallet_address as Address);

            // Update last_checked timestamp
            await supabase
                .from('users')
                .update({ last_checked: now.toISOString() })
                .eq('chat_id', user.chat_id);

            // Check if alert needed
            if (health.healthFactor < user.alert_threshold) {
                const collateral = health.totalCollateralUSD;
                const debt = health.totalDebtUSD;
                const utilization = getUtilization(collateral, debt);

                let alertMessage = `🚨 **LIQUIDATION ALERT** 🚨\n\n`;
                alertMessage += `Your Health Factor has dropped to **${formatHF(health.healthFactor)}**!\n\n`;

                alertMessage += `📊 **Position Summary:**\n`;
                alertMessage += `• Collateral: $${formatUSD(collateral)}\n`;
                alertMessage += `• Debt: $${formatUSD(debt)}\n`;
                alertMessage += `• Utilization: ${utilization.toFixed(1)}%\n\n`;

                if (health.suggestions) {
                    alertMessage += `💡 **To reach HF ${health.suggestions.targetHF}:**\n`;
                    if (health.suggestions.repayAmount > 0) {
                        alertMessage += `• Repay ~$${formatUSD(health.suggestions.repayAmount)} debt\n`;
                    }
                    if (health.suggestions.addCollateralAmount > 0) {
                        alertMessage += `• Add ~$${formatUSD(health.suggestions.addCollateralAmount)} collateral\n`;
                    }
                    alertMessage += `\n`;
                }

                alertMessage += `⚠️ Act now to avoid liquidation!`;

                const keyboard = new InlineKeyboard()
                    .url("Open Dashboard", `${DASHBOARD_URL}/dashboard`);

                await bot.api.sendMessage(user.chat_id, alertMessage, {
                    parse_mode: "Markdown",
                    reply_markup: keyboard
                });
            }
            return true;
        } catch (e) {
            console.error(`Error checking user ${user.chat_id}:`, e);
            return false;
        }
    }));

    const checkedCount = checkResults.filter(r => r.status === 'fulfilled' && r.value === true).length;

    if (checkedCount > 0) {
        console.log(`🔍 Checked ${checkedCount} users at ${now.toLocaleTimeString()}`);
    }
}, POLLING_CHECK_INTERVAL);

// --- Error Handling ---
bot.catch((err) => {
    console.error("Bot Error:", err);
});

// --- Start Bot ---
bot.start();
console.log("🤖 OpButler Bot Started with Smart Polling!");
