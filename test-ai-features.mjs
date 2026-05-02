async function testAIChat() {
  console.log("🚀 Menguji endpoint /api/chat ZENIX AI...");
  
  const payload = {
    messages: [
      { role: "user", content: "Tolong analisa BTCUSD saat ini dengan SMC." }
    ],
    model: "zenix-fast",
    settings: {
      language: "Bahasa Indonesia",
      personalIntelligence: ""
    }
  };

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status}`);
      const text = await response.text();
      console.error(`Response: ${text}`);
      return;
    }

    const data = await response.json();
    console.log("✅ Respons berhasil diterima!\n");
    console.log("--- OUTPUT AI ---");
    console.log(data.content);
    console.log("-----------------");
    
    // Check if it includes SMC keywords and Sentiment
    const contentLower = data.content.toLowerCase();
    const hasSMC = contentLower.includes("fvg") || contentLower.includes("liquidity") || contentLower.includes("bos") || contentLower.includes("choch") || contentLower.includes("order block");
    const hasSentiment = contentLower.includes("fear & greed") || contentLower.includes("sentimen") || contentLower.includes("extreme") || contentLower.includes("serakah") || contentLower.includes("greed") || contentLower.includes("fear");
    
    console.log("\n📊 HASIL VALIDASI FITUR:");
    console.log(`- SMC Logic Terdeteksi: ${hasSMC ? '✅ Ya' : '❌ Tidak'}`);
    console.log(`- Sentiment/Market Data Terdeteksi: ${hasSentiment ? '✅ Ya (Pastikan API external berjalan atau dihandle errornya)' : '❌ Tidak (Bisa jadi karena API limit atau market tutup)'}`);

  } catch (error) {
    console.error("❌ Gagal terhubung ke localhost:3000. Pastikan Next.js server (npm run dev) sedang berjalan.");
    console.error(error.message);
  }
}

testAIChat();
