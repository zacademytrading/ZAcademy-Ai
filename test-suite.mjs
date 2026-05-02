
const API_URL = 'http://localhost:3000/api/chat';

async function testPrompt(name, prompt, model = 'zenix-think') {
  console.log(`\n--- Testing: ${name} ---`);
  console.log(`Prompt: ${prompt}`);
  
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: model,
        settings: { language: 'Bahasa Indonesia' }
      })
    });

    const data = await res.json();
    if (data.error) {
      console.error(`❌ Error From API: ${data.error}`);
    } else {
      console.log(`✅ API Response Received!`);
      console.log(`Content Preview: "${data.content.substring(0, 500)}..."`);
      console.log(`Model Response: ${data.model || 'Default'}`);
    }
  } catch (err) {
    console.error(`❌ Request Failed: ${err.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting ZACADEMY AI Feature Validation...');
  
  // 1. Market Data (Testing integration with Twelve Data/Yahoo)
  await testPrompt('Market Data & Live Price', 'Berapa harga XAUUSD (Emas) saat ini? Sebutkan harganya sekarang.');
  
  // 2. Risk Calculator (Testing Math & System Prompt)
  await testPrompt('Risk Calculator Logic', 'Saya punya modal $1000, resiko 2%. Jika Entry di 2500 dan SL di 2450, berapa lot size yang harus saya pakai?');
  
  // 3. News Intent (Testing Web Search / RSS)
  await testPrompt('Market News & Sentiment', 'Apa sentimen berita terbaru tentang Bitcoin (BTC) hari ini?');
  
  // 4. Signal Format (Testing Signal Template Compliance)
  await testPrompt('Signal Generation Format', 'Buatkan signal trading untuk GBPUSD dengan RR 1:2 dan alasan teknikalnya.');
  
  console.log('\n🏁 Tests Completed.');
}

runTests();
