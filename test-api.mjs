async function testApi() {
  const symbols = ['BTC/USD', 'AAPL', 'GOLD'];
  for (const sym of symbols) {
    console.log(`Testing Symbol: ${sym}`);
    try {
      const res = await fetch(`http://localhost:3000/api/market/history?symbol=${encodeURIComponent(sym)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        console.log(`✅ ${sym}: Success, received ${data.length} data points.`);
        if (data.length > 0) console.log(`   Sample: Time: ${data[0].time}, Close: ${data[0].close}`);
      } else {
        console.log(`❌ ${sym}: Failed, response:`, data);
      }
    } catch (e) {
      console.log(`❌ ${sym}: Error:`, e.message);
    }
  }
}

testApi();
