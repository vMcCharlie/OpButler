
import { createPublicClient, http, parseAbi, getAddress } from 'viem';
import { bsc } from 'viem/chains';

const RAW_ADDR = '0xcb0620b13867623a9686a34d580436d463ca963c8c';
const RPC_URL = 'https://bsc-dataseed.binance.org/';

const COMPOUND_ABI = parseAbi(['function getAllMarkets() view returns (address[])']);
const AAVE_ABI = parseAbi(['function getReservesList() view returns (address[])']);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http(RPC_URL)
    });

    console.log(`Raw Address: ${RAW_ADDR}`);
    try {
        const checksummed = getAddress(RAW_ADDR);
        console.log(`Checksummed: ${checksummed}`);

        // Try Compound call
        try {
            console.log('Trying getAllMarkets (Compound)...');
            const mkts = await client.readContract({
                address: checksummed,
                abi: COMPOUND_ABI,
                functionName: 'getAllMarkets'
            });
            console.log('Is Compound/Venus Fork: YES');
            console.log('Markets:', mkts);
        } catch (e) {
            console.log('Is Compound/Venus Fork: NO (or call failed)');
        }

        // Try Aave call
        try {
            console.log('Trying getReservesList (Aave)...');
            const reserves = await client.readContract({
                address: checksummed,
                abi: AAVE_ABI,
                functionName: 'getReservesList'
            } as any);
            console.log('Is Aave Fork: YES');
            console.log('Reserves:', reserves);
        } catch (e) {
            console.log('Is Aave Fork: NO (or call failed)');
        }

    } catch (e) {
        console.error('Address is invalid per viem:', e);
    }
}

main();
