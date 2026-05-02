# Graph Report - zacademy-ai  (2026-05-02)

## Corpus Check
- 31 files · ~19,122 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 102 nodes · 115 edges · 9 communities detected
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 9|Community 9]]

## God Nodes (most connected - your core abstractions)
1. `getMarketData()` - 11 edges
2. `POST()` - 7 edges
3. `readDB()` - 6 edges
4. `detectAssetType()` - 5 edges
5. `writeDB()` - 5 edges
6. `handleAuth()` - 4 edges
7. `DELETE()` - 4 edges
8. `handleSubmit()` - 3 edges
9. `sendErrorAlert()` - 3 edges
10. `POST()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `testNews()` --calls--> `getLatestTradingNews()`  [INFERRED]
  test-news.mjs → src/lib/news.ts
- `sendErrorAlert()` --calls--> `saveErrorLog()`  [INFERRED]
  src/app/api/chat/route.ts → src/lib/error-service.ts
- `POST()` --calls--> `getMarketData()`  [INFERRED]
  src/app/api/chat/route.ts → src/lib/market-data.ts
- `GET()` --calls--> `detectAssetType()`  [INFERRED]
  src/app/api/market/history/route.ts → src/lib/market-data.ts
- `handleAuth()` --calls--> `signInWithEmail()`  [INFERRED]
  src/app/page.tsx → src/lib/supabase-client.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.16
Nodes (5): checkUserSession(), fetchChats(), handleKeyDown(), handleSubmit(), saveChat()

### Community 1 - "Community 1"
Cohesion: 0.27
Nodes (11): detectAssetType(), getCryptoData(), getForexData(), getMarketData(), getStockData(), getTwelveDataPrice(), getTwelveDataQuote(), getYahooFinanceData() (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.31
Nodes (7): POST(), DELETE(), GET(), POST(), readDB(), writeDB(), POST()

### Community 3 - "Community 3"
Cohesion: 0.31
Nodes (7): callGroq(), extractSymbol(), getHistoryData(), POST(), sendErrorAlert(), detectFVG(), detectStructure()

### Community 4 - "Community 4"
Cohesion: 0.32
Nodes (4): handleAuth(), resetPasswordForEmail(), signInWithEmail(), signUpWithEmail()

### Community 5 - "Community 5"
Cohesion: 0.33
Nodes (5): clearLogs(), getErrorLogs(), saveErrorLog(), DELETE(), GET()

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (2): getLatestTradingNews(), testNews()

### Community 7 - "Community 7"
Cohesion: 1.0
Nodes (2): runTests(), testPrompt()

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (2): GET(), getYahooHistory()

## Knowledge Gaps
- **Thin community `Community 6`** (5 nodes): `getLatestTradingNews()`, `getMarketSentiment()`, `news.ts`, `test-news.mjs`, `testNews()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 7`** (3 nodes): `test-suite.mjs`, `runTests()`, `testPrompt()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (3 nodes): `GET()`, `getYahooHistory()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `POST()` connect `Community 3` to `Community 1`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `getMarketData()` connect `Community 1` to `Community 3`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `sendErrorAlert()` connect `Community 3` to `Community 5`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `getMarketData()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`getMarketData()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `POST()` (e.g. with `getMarketData()` and `detectStructure()`) actually correct?**
  _`POST()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `readDB()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`readDB()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `detectAssetType()` (e.g. with `POST()` and `GET()`) actually correct?**
  _`detectAssetType()` has 3 INFERRED edges - model-reasoned connections that need verification._