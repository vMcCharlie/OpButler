
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
import { Account, PublicClient, WalletClient, Transport, Chain, verifyMessage } from "viem";
import * as fs from 'fs';
import * as path from 'path';

let account: Account;
let publicClient: PublicClient<Transport, Chain>;
let client: WalletClient<Transport, Chain, Account>;

// Data Store for Users
const USERS_FILE = path.join(__dirname, 'users.json');
interface UserData {
    chatId: number;
    username?: string;
    walletAddress: Address;
    alertThreshold: number; // e.g. 1.1
}

function getUsers(): UserData[] {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function saveUser(user: UserData) {
    const users = getUsers();
    const existingIndex = users.findIndex(u => u.chatId === user.chatId);
    if (existingIndex >= 0) {
        users[existingIndex] = user;
    } else {
        users.push(user);
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
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
        const valid = await publicClient.verifyMessage({
            address: '0x0000000000000000000000000000000000000000', // We don't know address yet, verifyMessage handles split? No, we need recoverAddress
            message,
            signature: signature as `0x${string}`
        });

        // Correct way to recover address from signature using viem
        // verifyMessage returns boolean if we provide address.
        // We need recoverMessageAddress to find WHO signed it.
        const { recoverMessageAddress } = require('viem');
        const recoveredAddress = await recoverMessageAddress({
            message,
            signature: signature as `0x${string}`
        });

        saveUser({
            chatId,
            username: ctx.from?.username,
            walletAddress: recoveredAddress,
            alertThreshold: 1.1
        });

        await ctx.reply(
            `✅ **Success!**\n\n` +
            `Linked Wallet: \`${recoveredAddress}\`\n` +
            `You will now receive alerts if your Health Factor drops below **1.1**.\n\n` +
            `Try \`/risk\` to check your status.`,
            { parse_mode: "Markdown" }
        );

    } catch (error) {
        console.error("Verification failed:", error);
        await ctx.reply("❌ Verification failed. Invalid signature or format.");
    }
});

bot.command("risk", async (ctx) => {
    const users = getUsers();
    const user = users.find(u => u.chatId === ctx.from?.id);

    if (!user) {
        return ctx.reply("⚠️ You have not linked a wallet yet. Use `/start` to begin.");
    }

    await ctx.reply("🔍 Checking Health Factor...");
    try {
        const { healthFactor, shortfall } = await manager.getAccountHealth(user.walletAddress);

        let status = "Unknown";
        if (healthFactor > 2) status = "🟢 Safe";
        else if (healthFactor > 1.1) status = "🟡 Warning";
        else status = "🔴 CRITICAL";

        await ctx.reply(
            `📊 **Risk Report**\n\n` +
            `Wallet: \`${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(38)}\`\n` +
            `Health Factor: **${healthFactor.toFixed(2)}**\n` +
            `Status: ${status}\n` +
            `Shortfall: $${shortfall.toFixed(2)}`,
            { parse_mode: "Markdown" }
        );
    } catch (e: any) {
        await ctx.reply(`Error fetching data: ${e.message}`);
    }
});

bot.command("status", async (ctx) => {
    const users = getUsers();
    const user = users.find(u => u.chatId === ctx.from?.id);

    if (user) {
        await ctx.reply(
            `👤 **Account Status**\n\n` +
            `Linked Wallet: \`${user.walletAddress}\`\n` +
            `Alert Threshold: HF < ${user.alertThreshold}`,
            { parse_mode: "Markdown" }
        );
    } else {
        await ctx.reply("❌ No wallet linked.");
    }
});

// --- Background Job: Monitor Risk ---
setInterval(async () => {
    const users = getUsers();
    console.log(`🔍 Monitoring ${users.length} users...`);

    for (const user of users) {
        try {
            const { healthFactor } = await manager.getAccountHealth(user.walletAddress);
            if (healthFactor < user.alertThreshold) {
                // Send Alert
                await bot.api.sendMessage(
                    user.chatId,
                    `🚨 **LIQUIDATION ALERT** 🚨\n\n` +
                    `Your Health Factor has dropped to **${healthFactor.toFixed(2)}**!\n` +
                    `Threshold: ${user.alertThreshold}\n\n` +
                    `Please repay debt or add collateral immediately to avoid liquidation.`
                );
            }
        } catch (e) {
            console.error(`Error monitoring user ${user.chatId}:`, e);
        }
    }
}, 60 * 1000 * 5); // Check every 5 minutes

// Start Bot
bot.catch((err) => {
    console.error("Bot Error:", err);
});

bot.start();
console.log("🤖 OpButler Telegram Bot Started!");
