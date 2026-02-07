
import { Bot, Context, InlineKeyboard } from "grammy";
import { StrategyManager } from "./index";
import { createWalletClient, createPublicClient, http, Address, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import "dotenv/config";

// --- Configuration & Security ---
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USER_ID = process.env.ALLOWED_USER_ID ? parseInt(process.env.ALLOWED_USER_ID) : null;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

if (!BOT_TOKEN) {
    console.error("❌ Error: TELEGRAM_BOT_TOKEN is required in .env");
    process.exit(1);
}

if (!PRIVATE_KEY || !PRIVATE_KEY.startsWith("0x") || PRIVATE_KEY.length !== 66) {
    console.error("❌ Error: Invalid PRIVATE_KEY. Must start with 0x and be 66 chars long.");
    process.exit(1);
}

// --- Initialization ---
let manager: StrategyManager;
import { Account, PublicClient, WalletClient, Transport, Chain } from "viem";

let account: Account;
let publicClient: PublicClient<Transport, Chain>;
let client: WalletClient<Transport, Chain, Account>;

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

// --- Middleware: Security Check ---
bot.use(async (ctx, next) => {
    if (ALLOWED_USER_ID && ctx.from?.id !== ALLOWED_USER_ID) {
        console.warn(`⚠️ Unauthorized access attempt from User ID: ${ctx.from?.id}`);
        return ctx.reply("⛔ Access Denied. You are not the authorized owner of this agent.");
    }
    await next();
});

// --- Helpers ---
async function getWalletBalance() {
    try {
        const balance = await publicClient.getBalance({ address: account.address });
        return `${formatEther(balance)} BNB`;
    } catch (e) {
        return "Error fetching balance";
    }
}

// --- Menus ---
const mainKeyboard = new InlineKeyboard()
    .text("💰 Check Balance", "balance")
    .text("📜 Active Strategies", "history")
    .row()
    .text("🚀 Execute Strategy", "exec_menu")
    .text("🛑 Unwind Strategy", "unwind_menu");

const execKeyboard = new InlineKeyboard()
    .text("Safe Loop (2x)", "exec_safe")
    .text("Degen Loop (3x)", "exec_degen")
    .row()
    .text("🔙 Back", "main_menu");

// --- Commands ---

bot.command("start", async (ctx) => {
    const balance = await getWalletBalance();
    await ctx.reply(
        `🤖 **OpButler Online**\n\n` +
        `👤 **Owner**: \`${account.address}\`\n` +
        `💰 **Balance**: ${balance}\n\n` +
        `Select an action below:`,
        { reply_markup: mainKeyboard, parse_mode: "Markdown" }
    );
});

bot.command("id", (ctx) => {
    ctx.reply(`Your User ID is: \`${ctx.from?.id}\``, { parse_mode: "Markdown" });
});

// --- Callbacks ---

bot.callbackQuery("main_menu", async (ctx) => {
    const balance = await getWalletBalance();
    await ctx.editMessageText(
        `🤖 **OpButler Online**\n\n` +
        `👤 **Owner**: \`${account.address}\`\n` +
        `💰 **Balance**: ${balance}\n\n` +
        `Select an action below:`,
        { reply_markup: mainKeyboard, parse_mode: "Markdown" }
    );
});

bot.callbackQuery("balance", async (ctx) => {
    const balance = await getWalletBalance();
    await ctx.answerCallbackQuery({ text: `Balance: ${balance}` });
    await ctx.reply(`💰 Current Balance: **${balance}**`, { parse_mode: "Markdown" });
});

bot.callbackQuery("history", async (ctx) => {
    const fs = require('fs');
    const path = require('path');
    const strategiesFile = path.join(__dirname, 'strategies.json');

    if (fs.existsSync(strategiesFile)) {
        const strategies = JSON.parse(fs.readFileSync(strategiesFile, 'utf-8'));
        if (strategies.length === 0) {
            return ctx.reply("📭 No active strategies.", { reply_markup: mainKeyboard });
        }

        let msg = "📜 **Active Strategies**:\n\n";
        strategies.forEach((s: any) => {
            msg += `🆔 \`${s.id}\`\nType: ${s.type}\nDebt: ${s.debtAmount}\n\n`;
        });
        await ctx.reply(msg, { parse_mode: "Markdown" });
    } else {
        await ctx.reply("📭 No strategies file found.", { reply_markup: mainKeyboard });
    }
    await ctx.answerCallbackQuery();
});

bot.callbackQuery("exec_menu", async (ctx) => {
    await ctx.editMessageText("🚀 **Select Strategy Mode**\n\nChoose a leverage level for BNB Loop:", { reply_markup: execKeyboard, parse_mode: "Markdown" });
});

bot.callbackQuery(["exec_safe", "exec_degen"], async (ctx) => {
    const leverage = ctx.callbackQuery.data === "exec_safe" ? 2 : 3;
    const asset = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; // WBNB
    const vAsset = "0xA07c5b74C9B40447a954e1466938b865b6BBea36"; // vBNB
    const debtAsset = "0x55d398326f99059fF775485246999027B3197955"; // USDT
    const vDebtAsset = "0xfD5840Cd36d94D7229439859C0112a4185BC0255"; // vUSDT
    // Safe default amount: 0.01 BNB (Verify user has this!)
    const amount = 10000000000000000n; // 0.01 BNB

    // Balance Check
    const balance = await publicClient.getBalance({ address: account.address });
    if (balance < amount) {
        return ctx.reply(`❌ **Insufficient Balance**\nRequired: 0.01 BNB\nHas: ${formatEther(balance)} BNB`, { parse_mode: "Markdown" });
    }

    await ctx.reply(`🔄 **Simulating Execution**...\nLeverage: ${leverage}x\nAmount: 0.01 BNB`);

    try {
        await manager.executeLongStrategy(asset, vAsset, debtAsset, vDebtAsset, amount, leverage);
        await ctx.reply("✅ **Strategy Executed Successfully!**");
    } catch (error: any) {
        console.error(error);
        await ctx.reply(`❌ **Execution Failed**:\n${error.message}`);
    }
    await ctx.answerCallbackQuery();
});

bot.callbackQuery("unwind_menu", async (ctx) => {
    await ctx.reply("To unwind, please use the command:\n`/unwind <strategy_id>`", { parse_mode: "Markdown" });
    await ctx.answerCallbackQuery();
});

// Start Bot
bot.catch((err) => {
    console.error("Bot Error:", err);
});

bot.start();
console.log("🤖 OpButler Telegram Bot Started!");
