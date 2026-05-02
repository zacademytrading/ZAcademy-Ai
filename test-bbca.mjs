
const API_URL = 'http://localhost:3000/api/chat';

async function testBBCA() {
  console.log('🚀 Testing BBCA Real-time Data...');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Berapa harga saham BBCA hari ini?' }],
        model: 'zenix-think',
        settings: { language: 'Bahasa Indonesia' }
      })
    });

    const data = await res.json();
    if (data.error) {
      console.error('❌ API Error:', data.error);
    } else {
      console.log('✅ Success! Content:', data.content.substring(0, 200) + '...');
    }
  } catch (err) {
    console.error('❌ Request Failed:', err.message);
  }
}

testBBCA();
