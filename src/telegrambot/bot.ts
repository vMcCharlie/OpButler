
import { Bot, InlineKeyboard } from "grammy";
import { createPublicClient, http, Address, formatUnits, formatEther, parseAbi, getAddress } from "viem";
import { recoverMessageAddress } from "viem";
import { bsc } from "viem/chains";
import { createServer } from "http";
import "dotenv/config";

// ============================================================
// Configuration & Validation
// ============================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://opbutler.xyz";

if (!BOT_TOKEN) { console.error("❌ TELEGRAM_BOT_TOKEN required"); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("❌ SUPABASE_URL and SUPABASE_KEY required"); process.exit(1); }

const VALID_INTERVALS = [60, 120, 360, 720, 960, 1440];
const INTERVAL_LABELS: Record<number, string> = {
    60: "1 hour", 120: "2 hours", 360: "6 hours",
    720: "12 hours", 960: "16 hours", 1440: "24 hours"
};

// ============================================================
// Clients
// ============================================================

const publicClient = createPublicClient({
    chain: bsc,
    transport: http("https://bsc-dataseed.binance.org/")
});
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new Bot(BOT_TOKEN);

// ============================================================
// Contract Addresses & ABIs
// ============================================================

const VENUS_COMPTROLLER = "0xfD36E2c2a6789Db23113685031d7F16329158384" as Address;

const KINZA_POOL = getAddress("0xcb0620b181140e57d1c0d8b724cde623ca963c8c");
const KINZA_DATA_PROVIDER = getAddress("0xe9381d8cbd9506a23b3e5e95f613dfb6eae0d01c");

const RADIANT_LENDING_POOL = getAddress("0xccf31d54c3a94f67b8ceff8dd771de5846da032c");

const COMPTROLLER_ABI = parseAbi([
    "function getAccountLiquidity(address account) view returns (uint256, uint256, uint256)",
    "function getAllMarkets() view returns (address[])",
    "function getAssetsIn(address account) view returns (address[])",
    "function oracle() view returns (address)"
]);

const VTOKEN_ABI = parseAbi([
    "function getAccountSnapshot(address account) view returns (uint256, uint256, uint256, uint256)",
    "function symbol() view returns (string)",
    "function borrowBalanceStored(address account) view returns (uint256)"
]);

const ORACLE_ABI = parseAbi([
    "function getUnderlyingPrice(address vToken) view returns (uint256)"
]);

const AAVE_POOL_ABI = parseAbi([
    "function getUserAccountData(address user) view returns (uint256, uint256, uint256, uint256, uint256, uint256)",
    "function getReservesList() view returns (address[])"
]);

const AAVE_DATA_PROVIDER_ABI = parseAbi([
    "function getUserReserveData(address asset, address user) view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, bool)"
]);

const ERC20_ABI = parseAbi([
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)"
]);

const RADIANT_RESERVE_ABI = parseAbi([
    "function getReserveData(address asset) view returns (uint256, uint128, uint128, uint128, uint128, uint128, uint40, address, address, address, address, uint8)"
]);

// ============================================================
// Types
// ============================================================

interface UserData {
    id: string;
    chat_id: number;
    username?: string;
    wallet_address: string;
    alert_threshold: number;
    polling_interval: number;
    last_checked: string;
    alerts_enabled: boolean;
    last_alert_sent?: string;
}

interface AssetPosition {
    symbol: string;
    supply: number;
    supplyUSD: number;
    borrow: number;
    borrowUSD: number;
}

interface ProtocolData {
    protocol: string;
    healthFactor: number;
    totalCollateralUSD: number;
    totalDebtUSD: number;
    positions: AssetPosition[];
    status: "safe" | "warning" | "danger" | "inactive";
}

// ============================================================
// Concurrency Guard — Per-User Command Mutex
// ============================================================

const userLocks = new Map<number, number>(); // chatId -> timestamp
const LOCK_TIMEOUT_MS = 30_000; // 30 seconds max lock

function acquireLock(chatId: number): boolean {
    const existing = userLocks.get(chatId);
    if (existing && Date.now() - existing < LOCK_TIMEOUT_MS) {
        return false; // Already locked
    }
    userLocks.set(chatId, Date.now());
    return true;
}

function releaseLock(chatId: number): void {
    userLocks.delete(chatId);
}

// ============================================================
// Formatting Helpers
// ============================================================

function fmt$(v: number): string {
    return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtHF(hf: number): string {
    if (hf >= 100) return "∞ (Safe)";
    return hf.toFixed(2);
}

function statusEmoji(status: string): string {
    return status === "safe" ? "🟢" : status === "warning" ? "🟡" : status === "danger" ? "🔴" : "⚪";
}

function statusLabel(status: string): string {
    return status === "safe" ? "Safe" : status === "warning" ? "Warning" : status === "danger" ? "DANGER" : "Inactive";
}

function classifyHF(hf: number): "safe" | "warning" | "danger" | "inactive" {
    if (hf > 1.5) return "safe";
    if (hf > 1.0) return "warning";
    return "danger";
}

// ============================================================
// Multi-Protocol Data Fetching
// ============================================================

async function fetchVenusData(wallet: Address): Promise<ProtocolData> {
    const result: ProtocolData = {
        protocol: "Venus",
        healthFactor: Infinity,
        totalCollateralUSD: 0,
        totalDebtUSD: 0,
        positions: [],
        status: "inactive"
    };

    try {
        const [, liquidity, shortfall] = await publicClient.readContract({
            address: VENUS_COMPTROLLER, abi: COMPTROLLER_ABI,
            functionName: "getAccountLiquidity", args: [wallet]
        }) as [bigint, bigint, bigint];

        const liq = parseFloat(formatEther(liquidity));
        const sf = parseFloat(formatEther(shortfall));

        // Get user's markets
        let assetsIn: Address[] = [];
        try {
            assetsIn = await publicClient.readContract({
                address: VENUS_COMPTROLLER, abi: COMPTROLLER_ABI,
                functionName: "getAssetsIn", args: [wallet]
            }) as Address[];
        } catch { /* User might not be in any markets */ }

        if (assetsIn.length === 0 && liq === 0 && sf === 0) return result;

        // Get oracle address
        const oracle = await publicClient.readContract({
            address: VENUS_COMPTROLLER, abi: COMPTROLLER_ABI,
            functionName: "oracle", args: []
        }) as Address;

        // Fetch per-asset data
        const assetResults = await Promise.allSettled(
            assetsIn.map(async (vToken) => {
                const [snapshot, underlyingPrice, sym] = await Promise.all([
                    publicClient.readContract({
                        address: vToken, abi: VTOKEN_ABI,
                        functionName: "getAccountSnapshot", args: [wallet]
                    }) as Promise<[bigint, bigint, bigint, bigint]>,
                    publicClient.readContract({
                        address: oracle, abi: ORACLE_ABI,
                        functionName: "getUnderlyingPrice", args: [vToken]
                    }) as Promise<bigint>,
                    publicClient.readContract({
                        address: vToken, abi: VTOKEN_ABI, functionName: "symbol"
                    }).catch(() => "UNKNOWN") as Promise<string>
                ]);

                const vBal = snapshot[1];
                const borrowBal = snapshot[2];
                const exchangeRate = snapshot[3];

                const supplyUnderlying = (vBal * exchangeRate) / BigInt(1e18);
                const supplyUSD = Number(supplyUnderlying) * Number(underlyingPrice) / 1e36;
                const borrowUSD = Number(borrowBal) * Number(underlyingPrice) / 1e36;

                let symbol = sym.startsWith("v") ? sym.slice(1) : sym;
                if (symbol === "BNB" || symbol === "WBNB") symbol = "BNB";

                return { symbol, supply: 0, supplyUSD, borrow: 0, borrowUSD };
            })
        );

        for (const r of assetResults) {
            if (r.status === "fulfilled" && (r.value.supplyUSD > 0.001 || r.value.borrowUSD > 0.001)) {
                result.positions.push(r.value);
                result.totalCollateralUSD += r.value.supplyUSD;
                result.totalDebtUSD += r.value.borrowUSD;
            }
        }

        // Calculate HF
        const AVG_CF = 0.75;
        if (result.totalDebtUSD > 0.001) {
            result.healthFactor = (result.totalCollateralUSD * AVG_CF) / result.totalDebtUSD;
        } else if (result.totalCollateralUSD > 0.001) {
            result.healthFactor = 100;
        }

        if (sf > 0) result.healthFactor = Math.min(result.healthFactor, 0.5);

        result.status = result.totalCollateralUSD > 0.001 || result.totalDebtUSD > 0.001
            ? classifyHF(result.healthFactor) : "inactive";

    } catch (err) {
        console.error("Venus fetch error:", err);
    }

    return result;
}

async function fetchKinzaData(wallet: Address): Promise<ProtocolData> {
    const result: ProtocolData = {
        protocol: "Kinza",
        healthFactor: Infinity,
        totalCollateralUSD: 0,
        totalDebtUSD: 0,
        positions: [],
        status: "inactive"
    };

    try {
        const accountData = await publicClient.readContract({
            address: KINZA_POOL, abi: AAVE_POOL_ABI,
            functionName: "getUserAccountData", args: [wallet]
        }) as [bigint, bigint, bigint, bigint, bigint, bigint];

        const totalCollateral = Number(accountData[0]) / 1e8;
        const totalDebt = Number(accountData[1]) / 1e8;
        const hf = Number(accountData[5]) / 1e18;

        if (totalCollateral < 0.001 && totalDebt < 0.001) return result;

        result.totalCollateralUSD = totalCollateral;
        result.totalDebtUSD = totalDebt;
        result.healthFactor = hf;
        result.status = classifyHF(hf);

        // Fetch per-asset positions
        try {
            const reserves = await publicClient.readContract({
                address: KINZA_POOL, abi: AAVE_POOL_ABI,
                functionName: "getReservesList"
            }) as Address[];

            const posResults = await Promise.allSettled(
                reserves.map(async (asset) => {
                    const userData = await publicClient.readContract({
                        address: KINZA_DATA_PROVIDER, abi: AAVE_DATA_PROVIDER_ABI,
                        functionName: "getUserReserveData", args: [asset, wallet]
                    }) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean];

                    const aTokenBal = userData[0];
                    const stableDebt = userData[1];
                    const variableDebt = userData[2];

                    if (aTokenBal === BigInt(0) && stableDebt === BigInt(0) && variableDebt === BigInt(0)) return null;

                    const [sym, dec] = await Promise.all([
                        publicClient.readContract({ address: asset, abi: ERC20_ABI, functionName: "symbol" }),
                        publicClient.readContract({ address: asset, abi: ERC20_ABI, functionName: "decimals" })
                    ]) as [string, number];

                    const supply = parseFloat(formatUnits(aTokenBal, dec));
                    const borrow = parseFloat(formatUnits(stableDebt + variableDebt, dec));

                    return { symbol: sym, supply, supplyUSD: 0, borrow, borrowUSD: 0 } as AssetPosition;
                })
            );

            for (const r of posResults) {
                if (r.status === "fulfilled" && r.value !== null) {
                    result.positions.push(r.value);
                }
            }
        } catch (posErr) {
            // Per-asset positions are optional — aggregate data is still valid
            console.warn("Kinza per-asset fetch failed (aggregate data OK):", posErr);
        }

    } catch (err) {
        console.error("Kinza fetch error:", err);
    }

    return result;
}

async function fetchRadiantData(wallet: Address): Promise<ProtocolData> {
    const result: ProtocolData = {
        protocol: "Radiant",
        healthFactor: Infinity,
        totalCollateralUSD: 0,
        totalDebtUSD: 0,
        positions: [],
        status: "inactive"
    };

    try {
        const accountData = await publicClient.readContract({
            address: RADIANT_LENDING_POOL, abi: AAVE_POOL_ABI,
            functionName: "getUserAccountData", args: [wallet]
        }) as [bigint, bigint, bigint, bigint, bigint, bigint];

        const totalCollateral = Number(accountData[0]) / 1e8;
        const totalDebt = Number(accountData[1]) / 1e8;
        const hf = Number(accountData[5]) / 1e18;

        if (totalCollateral < 0.001 && totalDebt < 0.001) return result;

        result.totalCollateralUSD = totalCollateral;
        result.totalDebtUSD = totalDebt;
        result.healthFactor = hf;
        result.status = classifyHF(hf);

        // Fetch per-asset positions via getReserveData + ERC20 balanceOf
        try {
            const reserves = await publicClient.readContract({
                address: RADIANT_LENDING_POOL, abi: AAVE_POOL_ABI,
                functionName: "getReservesList"
            }) as Address[];

            const posResults = await Promise.allSettled(
                reserves.map(async (asset) => {
                    const reserveData = await publicClient.readContract({
                        address: RADIANT_LENDING_POOL, abi: RADIANT_RESERVE_ABI,
                        functionName: "getReserveData", args: [asset]
                    }) as unknown as any[];

                    const aTokenAddr = reserveData[7] as Address;
                    const variableDebtAddr = reserveData[9] as Address;

                    const [aBal, dBal, sym, dec] = await Promise.all([
                        publicClient.readContract({ address: aTokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [wallet] }),
                        publicClient.readContract({ address: variableDebtAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [wallet] }),
                        publicClient.readContract({ address: asset, abi: ERC20_ABI, functionName: "symbol" }),
                        publicClient.readContract({ address: asset, abi: ERC20_ABI, functionName: "decimals" })
                    ]) as [bigint, bigint, string, number];

                    if (aBal === BigInt(0) && dBal === BigInt(0)) return null;

                    const supply = parseFloat(formatUnits(aBal, dec));
                    const borrow = parseFloat(formatUnits(dBal, dec));

                    return { symbol: sym, supply, supplyUSD: 0, borrow, borrowUSD: 0 } as AssetPosition;
                })
            );

            for (const r of posResults) {
                if (r.status === "fulfilled" && r.value !== null) {
                    result.positions.push(r.value);
                }
            }
        } catch (posErr) {
            console.warn("Radiant per-asset fetch failed (aggregate data OK):", posErr);
        }

    } catch (err) {
        console.error("Radiant fetch error:", err);
    }

    return result;
}

async function fetchAllProtocols(wallet: Address): Promise<ProtocolData[]> {
    const [venus, kinza, radiant] = await Promise.allSettled([
        fetchVenusData(wallet),
        fetchKinzaData(wallet),
        fetchRadiantData(wallet)
    ]);

    return [
        venus.status === "fulfilled" ? venus.value : { protocol: "Venus", healthFactor: Infinity, totalCollateralUSD: 0, totalDebtUSD: 0, positions: [], status: "inactive" as const },
        kinza.status === "fulfilled" ? kinza.value : { protocol: "Kinza", healthFactor: Infinity, totalCollateralUSD: 0, totalDebtUSD: 0, positions: [], status: "inactive" as const },
        radiant.status === "fulfilled" ? radiant.value : { protocol: "Radiant", healthFactor: Infinity, totalCollateralUSD: 0, totalDebtUSD: 0, positions: [], status: "inactive" as const },
    ];
}

// ============================================================
// Suggestion Engine
// ============================================================

function generateSuggestions(proto: ProtocolData, targetHF: number = 1.5): string {
    if (proto.status === "inactive" || proto.healthFactor >= targetHF) return "";

    const debt = proto.totalDebtUSD;
    const collateral = proto.totalCollateralUSD;
    if (debt < 0.01) return "";

    // For Venus: HF = (Collateral * CF) / Debt → need (targetHF * Debt) / CF collateral
    // For Aave: HF = (Collateral * LT) / Debt → same pattern
    const avgFactor = proto.protocol === "Venus" ? 0.75 : 0.80; // Average LT

    // Option 1: Repay debt → newDebt = (Collateral * Factor) / targetHF
    const targetDebt = (collateral * avgFactor) / targetHF;
    const repayAmount = Math.max(0, debt - targetDebt);

    // Option 2: Add collateral → newCollateral = (targetHF * Debt) / Factor
    const targetCollateral = (targetHF * debt) / avgFactor;
    const addAmount = Math.max(0, targetCollateral - collateral);

    let msg = `\n💡 *To reach HF ${targetHF.toFixed(1)} on ${proto.protocol}:*\n`;

    if (repayAmount > 0.01) {
        const repayPct = ((repayAmount / debt) * 100).toFixed(1);
        msg += `  • Repay ~$${fmt$(repayAmount)} of debt (${repayPct}% of total)\n`;
    }

    if (addAmount > 0.01) {
        const addPct = collateral > 0 ? ((addAmount / collateral) * 100).toFixed(1) : "N/A";
        msg += `  • Deposit ~$${fmt$(addAmount)} more collateral (+${addPct}%)\n`;
    }

    // Specific asset suggestions if we have positions
    if (proto.positions.length > 0) {
        const borrowedAssets = proto.positions.filter(p => p.borrow > 0);
        const suppliedAssets = proto.positions.filter(p => p.supply > 0);

        if (borrowedAssets.length > 0 && repayAmount > 0.01) {
            const topBorrow = borrowedAssets[0];
            msg += `  → e.g., repay some ${topBorrow.symbol} debt\n`;
        }
        if (suppliedAssets.length > 0 && addAmount > 0.01) {
            const topSupply = suppliedAssets[0];
            msg += `  → e.g., deposit more ${topSupply.symbol}\n`;
        }
    }

    return msg;
}

// ============================================================
// Message Builders
// ============================================================





function buildAlertMessage(proto: ProtocolData, threshold: number): string {
    let msg = `🚨 *LIQUIDATION ALERT* 🚨\n\n`;
    msg += `Your *${proto.protocol}* Health Factor has dropped to *${fmtHF(proto.healthFactor)}*!\n`;
    msg += `Your threshold is set to: *${threshold.toFixed(2)}*\n\n`;

    msg += `📊 *Position Summary:*\n`;
    msg += `• Collateral: $${fmt$(proto.totalCollateralUSD)}\n`;
    msg += `• Debt: $${fmt$(proto.totalDebtUSD)}\n`;
    if (proto.totalCollateralUSD > 0) {
        msg += `• Utilization: ${(proto.totalDebtUSD / proto.totalCollateralUSD * 100).toFixed(1)}%\n`;
    }

    const suggestions = generateSuggestions(proto);
    if (suggestions) msg += suggestions;

    msg += `\n⚠️ *Act now to avoid liquidation!*`;

    return msg;
}

// ============================================================
// Bot Commands
// ============================================================

bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard()
        .url("Open Dashboard", `${DASHBOARD_URL}/settings`);

    await ctx.reply(
        `🤖 *OpButler AI Risk Agent Online*\n\n` +
        `I am your autonomous guardian for DeFi positions on Venus, Kinza, and Radiant.\n\n` +
        `*Capabilities:*\n` +
        `• 🧠 *AI Analysis:* /analyze - Get "Good Vibes" risk advice\n` +
        `• 🛡️ *24/7 Watch:* I monitor your Health Factor while you sleep\n` +
        `• 🚨 *Instant Alerts:* I notify you before liquidation happens\n\n` +
        `*Commands:*\n` +
        `• /analyze — AI Portfolio Audit\n` +
        `• /settings — View alert config\n` +
        `• /setinterval — Set check frequency\n` +
        `• /setalert <value> — Set safety net\n\n` +
        `*Setup:*\n` +
        `1. Open Dashboard > Settings\n` +
        `2. Enter Telegram ID: \`${ctx.from?.id}\`\n` +
        `3. Sign & Verify`,
        { parse_mode: "Markdown", reply_markup: keyboard }
    );
});

bot.command("id", (ctx) => {
    ctx.reply(
        `Your Telegram ID is: \`${ctx.from?.id}\`\n\nUse this when linking your wallet on the dashboard.`,
        { parse_mode: "Markdown" }
    );
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

        const { error } = await supabase
            .from("users")
            .upsert({
                chat_id: chatId,
                username: ctx.from?.username,
                wallet_address: recoveredAddress.toLowerCase(),
                alert_threshold: 1.1,
                polling_interval: 60,
                alerts_enabled: true,
                last_checked: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: "chat_id" });

        if (error) {
            console.error("Supabase Error:", error);
            throw new Error("Database error");
        }

        await ctx.reply(
            `✅ *Wallet Linked Successfully!*\n\n` +
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



// /settings — View current settings
bot.command("settings", async (ctx) => {
    const { data: user } = await supabase
        .from("users").select("*")
        .eq("chat_id", ctx.from?.id).single();

    if (!user) {
        return ctx.reply("❌ No wallet linked. Use `/start` to begin.", { parse_mode: "Markdown" });
    }

    const intervalLabel = INTERVAL_LABELS[user.polling_interval] || `${user.polling_interval} min`;

    await ctx.reply(
        `⚙️ *Your Settings*\n\n` +
        `🔗 Wallet: \`${user.wallet_address}\`\n` +
        `⏰ Polling Interval: *${intervalLabel}*\n` +
        `⚠️ Alert Threshold: HF < *${user.alert_threshold}*\n` +
        `🔔 Alerts: ${user.alerts_enabled ? "✅ Enabled" : "❌ Disabled"}\n\n` +
        `*Commands:*\n` +
        `• /settings — View alert settings\n` +
        `• /setinterval — Change polling frequency\n` +
        `• /setalert <value> — Change HF threshold\n` +
        `• /togglealerts — Enable/disable alerts`,
        { parse_mode: "Markdown" }
    );
});

// /setinterval — Change polling interval
bot.command("setinterval", async (ctx) => {
    const keyboard = new InlineKeyboard()
        .text("1 hour", "interval_60").text("2 hours", "interval_120").row()
        .text("6 hours", "interval_360").text("12 hours", "interval_720").row()
        .text("16 hours", "interval_960").text("24 hours", "interval_1440");

    await ctx.reply(
        "⏰ *Select Polling Interval*\n\nHow often should I check your positions?",
        { parse_mode: "Markdown", reply_markup: keyboard }
    );
});

bot.callbackQuery(/^interval_(\d+)$/, async (ctx) => {
    const interval = parseInt(ctx.match![1]);
    if (!VALID_INTERVALS.includes(interval)) {
        return ctx.answerCallbackQuery({ text: "Invalid interval", show_alert: true });
    }

    const { error } = await supabase
        .from("users")
        .update({ polling_interval: interval, updated_at: new Date().toISOString() })
        .eq("chat_id", ctx.from.id);

    if (error) return ctx.answerCallbackQuery({ text: "Failed to update", show_alert: true });

    await ctx.answerCallbackQuery({ text: `Updated to ${INTERVAL_LABELS[interval]}` });
    await ctx.editMessageText(
        `✅ *Polling Interval Updated*\n\nYour positions will now be checked every *${INTERVAL_LABELS[interval]}*.`,
        { parse_mode: "Markdown" }
    );
});

// /setalert — Set alert threshold  
bot.command("setalert", async (ctx) => {
    const valStr = ctx.match;
    if (!valStr) {
        const keyboard = new InlineKeyboard()
            .text("1.1", "alert_1.1").text("1.2", "alert_1.2").text("1.3", "alert_1.3").row()
            .text("1.4", "alert_1.4").text("1.5", "alert_1.5").text("1.8", "alert_1.8");

        return ctx.reply(
            "⚠️ *Select Health Factor Alert Threshold*\n\n" +
            "I will alert you if your HF drops below this value. Recommended: *1.1* or *1.2*.",
            { parse_mode: "Markdown", reply_markup: keyboard }
        );
    }

    const value = parseFloat(valStr);
    if (isNaN(value) || value < 1.0 || value > 2.0) {
        return ctx.reply("⚠️ Threshold must be between 1.0 and 2.0. Example: `/setalert 1.2`", { parse_mode: "Markdown" });
    }

    const { error } = await supabase
        .from("users")
        .update({ alert_threshold: value, updated_at: new Date().toISOString() })
        .eq("chat_id", ctx.from?.id);

    if (error) return ctx.reply("❌ Failed to update threshold.");
    await ctx.reply(`✅ Alert threshold set to HF < *${value}*`, { parse_mode: "Markdown" });
});

bot.callbackQuery(/^alert_(\d+(\.\d+)?)$/, async (ctx) => {
    const value = parseFloat(ctx.match![1]);
    const { error } = await supabase
        .from("users")
        .update({ alert_threshold: value, updated_at: new Date().toISOString() })
        .eq("chat_id", ctx.from.id);

    if (error) return ctx.answerCallbackQuery({ text: "Failed to update", show_alert: true });

    await ctx.answerCallbackQuery({ text: `Updated to ${value}` });
    await ctx.editMessageText(
        `✅ *Alert Threshold Updated*\n\nYou will now be alerted if your Health Factor drops below *${value}*.`,
        { parse_mode: "Markdown" }
    );
});

// /togglealerts — Enable/disable alerts
bot.command("togglealerts", async (ctx) => {
    const { data: user } = await supabase
        .from("users").select("alerts_enabled")
        .eq("chat_id", ctx.from?.id).single();

    if (!user) return ctx.reply("❌ No wallet linked.");

    const newState = !user.alerts_enabled;
    await supabase
        .from("users")
        .update({ alerts_enabled: newState, updated_at: new Date().toISOString() })
        .eq("chat_id", ctx.from?.id);

    await ctx.reply(
        newState
            ? "🔔 *Alerts Enabled*\nYou will receive liquidation warnings."
            : "🔕 *Alerts Disabled*\nYou won't receive automatic alerts.",
        { parse_mode: "Markdown" }
    );
});





// ============================================================
// Background Health Monitor (Polling Loop)
// ============================================================

const POLLING_HEARTBEAT_MS = 60_000; // 60 seconds
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const USER_STAGGER_MS = 500; // 500ms between users to avoid RPC rate limits
let pollingMutex = false;

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runPollingCycle(): Promise<void> {
    if (pollingMutex) {
        // Reduced noise: only log if it's genuinely stuck, or just return silently
        // console.log("⏭️ Skipping poll — previous cycle still running");
        return;
    }

    pollingMutex = true;

    try {
        console.log(`⏱️ Starting Polling Cycle at ${new Date().toISOString()}`);
        const now = new Date();

        const { data: users, error } = await supabase
            .from("users")
            .select("*")
            .eq("alerts_enabled", true);

        if (error || !users || users.length === 0) {
            if (error) console.error("Error fetching users:", error);
            return;
        }

        let checkedCount = 0;

        for (const user of users) {
            // Check if it's time for this user
            const lastChecked = new Date(user.last_checked);
            const intervalMs = user.polling_interval * 60 * 1000;
            if (now.getTime() - lastChecked.getTime() < intervalMs) continue;

            try {
                const protocols = await fetchAllProtocols(user.wallet_address as Address);

                // Update last_checked
                await supabase
                    .from("users")
                    .update({ last_checked: now.toISOString() })
                    .eq("chat_id", user.chat_id);

                // Check each protocol for alerts
                for (const proto of protocols) {
                    if (proto.status === "inactive") continue;
                    if (proto.healthFactor >= user.alert_threshold) continue;

                    // Check cooldown
                    if (user.last_alert_sent) {
                        const lastAlert = new Date(user.last_alert_sent);
                        if (now.getTime() - lastAlert.getTime() < ALERT_COOLDOWN_MS) {
                            continue; // Still in cooldown
                        }
                    }

                    // Send alert
                    const alertMsg = buildAlertMessage(proto, user.alert_threshold);
                    const keyboard = new InlineKeyboard()
                        .url("Manage Position", `${DASHBOARD_URL}/portfolio`);

                    try {
                        await bot.api.sendMessage(user.chat_id, alertMsg, { parse_mode: "Markdown", reply_markup: keyboard });

                        // Update last_alert_sent
                        await supabase
                            .from("users")
                            .update({ last_alert_sent: now.toISOString() })
                            .eq("chat_id", user.chat_id);

                        console.log(`🚨 Alert sent to ${user.chat_id}`);

                    } catch (sendErr) {
                        console.error(`Failed to send alert to ${user.chat_id}:`, sendErr);
                    }
                }

            } catch (err) {
                console.error(`Error processing user ${user.chat_id}:`, err);
            }

            checkedCount++;
            await sleep(USER_STAGGER_MS);
        }

    } catch (err) {
        console.error("Polling cycle error:", err);
    } finally {
        pollingMutex = false;
    }
}

// ============================================================
// ============================================================
// ============================================================
// AI Agent Logic (DISABLED)
// ============================================================

// const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// let aiClient: GoogleGenAI | null = null;
// ... (Code removed for simplification)

async function getPortfolioSummary(protocols: ProtocolData[]): Promise<string> {
    const activeProtocols = protocols.filter(p => p.status !== "inactive");
    if (activeProtocols.length === 0) return "🤖 *OpButler:* No active positions found.";

    let msg = "📊 *Portfolio Snapshot*\n\n";
    for (const p of activeProtocols) {
        msg += `*${p.protocol}*: HF ${p.healthFactor.toFixed(2)}\n`;
        msg += `Collateral: $${(p.totalCollateralUSD).toFixed(0)}\n`;
        msg += `Debt: $${(p.totalDebtUSD).toFixed(0)}\n\n`;
    }
    msg += "To get AI insights, this feature is currently maintenance mode.";
    return msg;
}

// /help — List all commands
bot.command("help", async (ctx) => {
    await ctx.reply(
        "📚 *OpButler Commands*\n\n" +
        "/analyze — AI Portfolio Report\n" +
        "/settings — View your risk settings\n" +
        "/setalert <value> — Set Health Factor threshold (e.g., 1.5)\n" +
        "/togglealerts — Turn alerts on/off\n" +
        "/forcecheck — ⚠️ Run immediate health check\n" +
        "/start — Link your wallet\n\n" +
        "💡 *Tip:* You can also just chat with me! Ask \"How is my portfolio?\"",
        { parse_mode: "Markdown" }
    );
});

// /forcecheck — Debugging tool to test alerts immediately
bot.command("forcecheck", async (ctx) => {
    const { data: user } = await supabase
        .from("users").select("*")
        .eq("chat_id", ctx.from?.id).single();

    if (!user) return ctx.reply("❌ No wallet linked.");

    await ctx.reply("🕵️‍♂️ *OpButler Agent:* Scanning blockchain for updated positions...");

    try {
        const protocols = await fetchAllProtocols(user.wallet_address as Address);
        let alertTriggered = false;

        for (const proto of protocols) {
            if (proto.status === "inactive") continue;

            // Check condition
            const isCritical = proto.healthFactor < user.alert_threshold;

            await ctx.reply(
                `🔎 *${proto.protocol} Check*\n` +
                `Health: ${proto.healthFactor.toFixed(2)} / ${user.alert_threshold}\n` +
                `Result: ${isCritical ? "🚨 CRITICAL" : "✅ SAFE"}`,
                { parse_mode: "Markdown" }
            );

            if (isCritical) {
                alertTriggered = true;
                // We don't send the official alert here to avoid messing up the cooldown/database state,
                // but we visually confirm it would trigger.
            }
        }

        if (alertTriggered) {
            await ctx.reply("⚠️ Alerts WOULD trigger based on these values.");
        } else {
            await ctx.reply("👍 System checks out. No alerts needed right now.");
        }

    } catch (err) {
        await ctx.reply("❌ Error checking protocols: " + err);
    }
});

bot.command("analyze", async (ctx) => {
    const { data: user } = await supabase
        .from("users").select("wallet_address")
        .eq("chat_id", ctx.from?.id).single();

    if (!user) return ctx.reply("❌ No wallet linked.");

    await ctx.reply("🤖 *OpButler:* analyzing...", { parse_mode: "Markdown" });
    const protocols = await fetchAllProtocols(user.wallet_address as Address);
    const summary = await getPortfolioSummary(protocols);

    await ctx.reply(summary, { parse_mode: "Markdown" });
});

// Simple catch-all for unknown commands
bot.on("message", (ctx) => {
    ctx.reply(
        "🤖 *OpButler Agent:* I am tracking your positions.\n" +
        "Use /analyze for a status report or /settings to configure alerts."
    );
});

// ============================================================
// Error Handling & Start
// ============================================================

bot.catch((err) => {
    console.error("Bot Error:", err);
});

// Start polling loop
setInterval(runPollingCycle, POLLING_HEARTBEAT_MS);

// Start bot
bot.api.setMyCommands([
    { command: "analyze", description: "AI Portfolio Report" },
    { command: "settings", description: "View Alerts & Settings" },
    { command: "help", description: "List all commands" },
    { command: "forcecheck", description: "Test Health Alerts" },
    { command: "debug", description: "Diagnostics" },
    { command: "start", description: "Restart & Link Wallet" },
]);

bot.command("debug", async (ctx) => {
    const uptime = process.uptime();
    const pid = process.pid;
    await ctx.reply(
        `🛠 **Bot Diagnostics**\n` +
        `PID: \`${pid}\`\n` +
        `Uptime: ${uptime.toFixed(0)}s\n` +
        `Polling Mutex: ${pollingMutex ? "LOCKED" : "OPEN"}\n` +
        `Heartbeat: ${POLLING_HEARTBEAT_MS / 1000}s`,
        { parse_mode: "Markdown" }
    );
});

// Handle fatal errors during startup
bot.start({
    onStart: (botInfo) => {
        console.log(`🤖 OpButler Bot Started (@${botInfo.username}) — Monitoring Venus, Kinza, Radiant on BSC`);
    }
}).catch((err) => {
    console.error("❌ BOT STARTUP ERROR:", err);
    if (err.error_code === 409) {
        console.error("⚠️ CONFLICT DETECTED: Another instance of this bot is already running!");
        console.error("👉 Please stop all other running instances of the bot script.");
    }
    process.exit(1);
});

// ============================================================
// Health Check Server (for Railway/Render/Heroku)
// ============================================================
const PORT = process.env.PORT || 3000;
createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot is running");
}).listen(PORT, () => {
    console.log(`❤️  Health check server listening on port ${PORT}`);
});
