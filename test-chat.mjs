async function testChat() {
  console.log('Testing Chat API (ZENIX AI)...');
  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Bagaimana kabar pasar hari ini? Analisa BTC.' }],
        model: 'zenix-fast',
        settings: { language: 'Bahasa Indonesia' }
      })
    });
    
    const data = await res.json();
    if (data.content) {
      console.log('✅ Chat Success!');
      console.log('AI Response (Preview):', data.content.slice(0, 300) + '...');
    } else {
      console.log('❌ Chat Failed:', data);
    }
  } catch (e) {
    console.log('❌ Chat Error:', e.message);
  }
}

testChat();
