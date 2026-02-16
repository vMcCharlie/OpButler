
const { createPublicClient, http, parseAbi, getAddress } = require('viem');
const { bsc } = require('viem/chains');

const VENUS_ADDR = '0xfd36e2c2a6789db23113685031d7f16329158384';
const KINZA_ADDR = '0xcb0620b13867623a9686a34d580436d463ca963c8c';

console.log('--- STARTING CHECKS (V3) ---');

try {
    console.log(`Checking Venus (Length: ${VENUS_ADDR.length})`);
    console.log('Venus Checksum:', getAddress(VENUS_ADDR));
} catch(e) {
    console.error('Venus FAILED:', e.message);
}

try {
    console.log(`Checking Kinza (Length: ${KINZA_ADDR.length})`);
    if (!/^0x[0-9a-fA-F]{40}$/.test(KINZA_ADDR)) {
        console.error('Kinza REGEX FAILED');
    } else {
        console.log('Kinza REGEX OK');
        console.log('Kinza Checksum:', getAddress(KINZA_ADDR));
    }
} catch(e) {
    console.error('Kinza FAILED:', e.message);
}
console.log('--- END CHECKS ---');
