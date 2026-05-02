import axios from 'axios';
import * as cheerio from 'cheerio';

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

const RSS_FEEDS = [
  { name: 'Investing.com', url: 'https://id.investing.com/rss/news.rss' },
  { name: 'CNBC Indonesia', url: 'https://www.cnbcindonesia.com/market/rss' },
];

export async function getLatestTradingNews(symbol?: string): Promise<NewsItem[]> {
  try {
    const allNews: NewsItem[] = [];

    for (const feed of RSS_FEEDS) {
      const response = await axios.get(feed.url, { timeout: 5000 });
      const $ = cheerio.load(response.data, { xmlMode: true });

      $('item').slice(0, 5).each((_, el) => {
        const title = $(el).find('title').text();
        const link = $(el).find('link').text();
        const pubDate = $(el).find('pubDate').text();

        // Jika ada simbol, filter berita yang relevan saja (opsional)
        if (symbol) {
          if (title.toLowerCase().includes(symbol.toLowerCase())) {
            allNews.push({ title, link, pubDate, source: feed.name });
          }
        } else {
          allNews.push({ title, link, pubDate, source: feed.name });
        }
      });
    }

    return allNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  } catch (error) {
    console.error('Error fetching RSS news:', error);
    return [];
  }
}

export async function getMarketSentiment(symbol: string, assetType?: string): Promise<string> {
  try {
    let sentimentText = '';
    
    // 1. Crypto Fear & Greed Index
    const isCrypto = assetType === 'crypto' || ['BTC', 'ETH', 'CRYPTO'].some(k => symbol.toUpperCase().includes(k));
    
    if (isCrypto) {
      const res = await axios.get('https://api.alternative.me/fng/', { timeout: 4000 });
      if (res.data && res.data.data && res.data.data.length > 0) {
        const data = res.data.data[0];
        const val = parseInt(data.value);
        sentimentText += `Indeks Fear & Greed Crypto: ${val}/100 (${data.value_classification}). `;
        
        if (val < 30) {
          sentimentText += `Pasar dalam fase ketakutan ekstrem (Extreme Fear). Ini sering menjadi area akumulasi (Discount) bagi Smart Money/Whale sebelum Liquidity Sweep. `;
        } else if (val > 70) {
          sentimentText += `Pasar sedang sangat serakah (Extreme Greed). Waspada fase distribusi di area Premium dan potensi jebakan ritel (Bull Trap). `;
        } else {
          sentimentText += `Sentimen pasar saat ini Netral. Order Flow bergerak normal tanpa kepanikan. `;
        }
      }
    } 
    // 2. Saham Global & IHSG (Pendekatan Makro)
    else if (assetType === 'stock' || assetType === 'stock_idx' || assetType === 'index') {
      sentimentText += `Pasar saham sedang dipengaruhi oleh laporan pendapatan (Earnings) dan kebijakan suku bunga makro. Perhatikan rotasi sektoral dan volume transaksi harian institusi. `;
    }
    // 3. Forex & Komoditas (XAU, WTI)
    else if (assetType === 'forex' || assetType === 'commodity') {
       if (symbol.includes('XAU') || symbol.includes('GOLD') || symbol.includes('EMAS')) {
         sentimentText += `Sentimen Emas (XAU) sangat dipengaruhi oleh Dolar AS (DXY) dan tensi geopolitik global. Emas sering berfungsi sebagai instrumen Safe Haven saat ketidakpastian tinggi. `;
       } else {
         sentimentText += `Pergerakan didorong oleh berita kalender ekonomi (NFP, CPI, Keputusan Suku Bunga Bank Sentral). Pastikan tidak menahan posisi besar jelang rilis berita merah (High Impact). `;
       }
    }

    return sentimentText.trim();
  } catch (error) {
    console.error('Error fetching sentiment:', error);
    return '';
  }
}
