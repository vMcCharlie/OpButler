
const { getAddress } = require('viem');

const ADDR = '0xcB0620b13867623a9686A34d580436d463cA963c8C';

console.log(`String: "${ADDR}"`);
console.log(`Length: ${ADDR.length}`);

console.log('Char codes:');
for (let i = 0; i < ADDR.length; i++) {
    console.log(`${i}: ${ADDR[i]} (${ADDR.charCodeAt(i)})`);
}

const lower = ADDR.toLowerCase();
console.log(`Lower: "${lower}"`);

try {
    console.log('getAddress(lower):', getAddress(lower));
} catch (e) {
    console.error('getAddress(lower) failed:', e.message);
}

try {
    console.log('getAddress(original):', getAddress(ADDR));
} catch (e) {
    console.error('getAddress(original) failed:', e.message);
}
