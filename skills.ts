import { StrategyManager } from './index';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';
import 'dotenv/config';

// Initialize Manager (Singleton or per-request)
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const publicClient = createPublicClient({
    chain: bsc,
    transport: http()
});

let manager: StrategyManager;

if (PRIVATE_KEY && PRIVATE_KEY.startsWith("0x") && PRIVATE_KEY.length === 66) {
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const client = createWalletClient({
        account,
        chain: bsc,
        transport: http()
    });
    manager = new StrategyManager(publicClient, client);
} else {
    manager = new StrategyManager(publicClient);
}

// Skill A: "The Looper"
export const TheLooper = {
    name: "executeLongStrategy",
    description: "Executes a leveraged long strategy: Supply Collateral -> Borrow Stable -> Swap -> Supply Collateral. CHECKS SIMULATION FIRST.",
    parameters: {
        type: "object",
        properties: {
            asset: {
                type: "string",
                description: "Address of the asset to long (e.g., BNB, WBTC)"
            },
            vAsset: {
                type: "string",
                description: "Address of the Venus vToken for the asset"
            },
            debtAsset: {
                type: "string",
                description: "Address of the stablecoin to borrow (e.g., USDT)"
            },
            vDebtAsset: {
                type: "string",
                description: "Address of the Venus vToken for the debt asset"
            },
            amount: {
                type: "string",
                description: "Amount of asset to supply (in Wei or base units, passed as string)"
            },
            leverage: {
                type: "number",
                description: "Leverage level (e.g., 2.5 for 2.5x)"
            }
        },
        required: ["asset", "vAsset", "debtAsset", "vDebtAsset", "amount", "leverage"]
    },
    handler: async (args: any) => {
        try {
            console.log("Agent invoking The Looper...");
            await manager.executeLongStrategy(
                args.asset,
                args.vAsset,
                args.debtAsset,
                args.vDebtAsset,
                BigInt(args.amount),
                args.leverage
            );
            return "Strategy Execution logic completed successfully.";
        } catch (error: any) {
            return `Strategy Execution Failed: ${error.message}`;
        }
    }
};

// Skill B: "The Unwinder"
export const TheUnwinder = {
    name: "unwindStrategy",
    description: "Unwinds an active strategy: Withdraw Collateral -> Swap -> Repay Debt -> Return funds.",
    parameters: {
        type: "object",
        properties: {
            strategyId: {
                type: "number",
                description: "ID of the strategy to unwind"
            }
        },
        required: ["strategyId"]
    },
    handler: async (args: any) => {
        try {
            console.log("Agent invoking The Unwinder...");
            await manager.unwindStrategy(args.strategyId);
            return "Strategy Unwind logic completed successfully.";
        } catch (error: any) {
            return `Strategy Unwind Failed: ${error.message}`;
        }
    }
};

// Export capability for module loading
// Skill C: "The Risk Monitor"
export const TheRiskMonitor = {
    name: "getAccountHealth",
    description: "Checks the health factor of a user's account on Venus Protocol. Returns Health Factor, Liquidity, and Shortfall.",
    parameters: {
        type: "object",
        properties: {
            account: {
                type: "string",
                description: "Address of the user account to check"
            }
        },
        required: ["account"]
    },
    handler: async (args: any) => {
        try {
            console.log("Agent invoking The Risk Monitor...");
            const health = await manager.getAccountHealth(args.account);
            return JSON.stringify(health);
        } catch (error: any) {
            return `Health Check Failed: ${error.message}`;
        }
    }
};

// Export capability for module loading
export const skills = [TheLooper, TheUnwinder, TheRiskMonitor];
