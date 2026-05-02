import { getLatestTradingNews } from './src/lib/news.js';

async function testNews() {
  console.log('Testing News Fetching (General)...');
  const generalNews = await getLatestTradingNews();
  console.log(`Received ${generalNews.length} general news items.`);
  if (generalNews.length > 0) {
    console.log('Sample:', generalNews[0].title);
  }

  console.log('\nTesting News Fetching (Symbol: IHSG)...');
  const symbolNews = await getLatestTradingNews('IHSG');
  console.log(`Received ${symbolNews.length} news items for IHSG.`);
  if (symbolNews.length > 0) {
    console.log('Sample:', symbolNews[0].title);
  }
}

testNews();
