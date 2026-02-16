
const { createPublicClient, http, parseAbi, formatUnits } = require('viem');
const { bsc } = require('viem/chains');

const USER_ADDRESS = '0x8bE7444d1e318E60C7955ecd9426Aa2e77e11EDC';
const KBNB = '0xf5e0ADda6Fb191A332A787DEeDFD2cFFC72Dba0c';
const TARGET = '0xCC650b486f723C924370656b509a82bD69526739';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const ERC20_ABI = parseAbi([
    'function balanceOf(address account) view returns (uint256)',
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    try {
        console.log(`Checking balance for ${KBNB} (kBNB)...`);
        const balK = await client.readContract({
            address: KBNB,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [USER_ADDRESS]
        });
        console.log(`Balance: ${formatUnits(balK, 18)}`);
    } catch (e) {
        console.log('kBNB balance check failed');
    }

    try {
        console.log(`Checking balance for ${TARGET} (Target)...`);
        const balT = await client.readContract({
            address: TARGET,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [USER_ADDRESS]
        });
        console.log(`Balance: ${formatUnits(balT, 18)}`);
    } catch (e) {
        console.log('Target balance check failed');
    }
}

main();
