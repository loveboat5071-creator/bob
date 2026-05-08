import * as cheerio from 'cheerio';

export interface ScrapedInfo {
  menuName: string;
  price: number;
  rating: number;
}

export async function scrapeInfoFromDaum(placeName: string, region: string): Promise<ScrapedInfo | null> {
  const query = encodeURIComponent(`${placeName} ${region} 메뉴`);
  const url = `https://search.daum.net/search?w=tot&q=${query}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    let menuName = '';
    let price = 0;
    let rating = 0;

    // 1. 장소 정보가 포함된 영역을 찾음
    const placeCard = $('.wrap_place, .coll_cont').first();

    // 2. 평점 추출 시도
    const ratingText = placeCard.find('.rating .txt_num, .score .txt_num, .txt_score').first().text().trim();
    rating = parseFloat(ratingText) || 0;
    
    // 2. 메뉴명과 가격 추출 시도
    // Daum 검색 결과의 '장소' 탭이나 미니 카드 구조를 타겟팅
    const menuItems = placeCard.find('.list_menu li, .item_menu');
    
    if (menuItems.length > 0) {
      const firstItem = $(menuItems[0]);
      menuName = firstItem.find('.txt_menu, .tit_item, .tit_name').text().trim();
      const priceText = firstItem.find('.txt_price, .txt_info, .price').text().trim();
      price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
    }

    // 만약 위에서 못찾았다면 전체 문서에서 가장 그럴듯한 첫 번째 메뉴 가격 쌍을 찾음
    if (!menuName) {
      $('.list_menu li').each((_, el) => {
        const name = $(el).find('.txt_menu, .tit_item').text().trim();
        const pText = $(el).find('.txt_price, .price').text().trim();
        if (name && !menuName) {
          menuName = name;
          price = parseInt(pText.replace(/[^0-9]/g, '')) || 0;
          return false;
        }
      });
    }

    if (!menuName) return { menuName: '정보 없음', price: 0, rating };

    return { menuName, price, rating };
  } catch (error) {
    console.error('Scraping error:', error);
    return null;
  }
}
