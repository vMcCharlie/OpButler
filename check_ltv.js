const fetch = require('node-fetch');

async function checkLTV() {
    console.log("Fetching Yields...");
    const response = await fetch('https://yields.llama.fi/pools');
    const json = await response.json();
    const data = json.data;

    // Filter for Venus/Kinza on BSC
    const relevant = data.filter(p =>
        p.chain === 'BSC' &&
        (p.project === 'venus-core-pool' || p.project === 'kinza-finance') &&
        p.tvlUsd > 1000000 // Filter noise
    );

    console.log(`Found ${relevant.length} pools.`);

    // Log a few samples to see if 'ltv' or 'maxLtv' exists
    relevant.slice(0, 5).forEach(p => {
        console.log(`[${p.project}] ${p.symbol}: LTV=${p.ltv}, MaxLTV=${p.maxLtv}, APY=${p.apy}`);
    });
}

checkLTV();
