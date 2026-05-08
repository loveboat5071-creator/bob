import { scrapeInfoFromDaum } from './utils/scraper';

async function test() {
  console.log("Testing scraper for '바스버거 강남'...");
  const result = await scrapeInfoFromDaum('바스버거', '강남구');
  console.log("Result:", JSON.stringify(result, null, 2));
}

test();
