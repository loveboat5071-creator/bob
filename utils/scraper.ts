import * as cheerio from 'cheerio';

export interface ScrapedInfo {
  menuName: string;
  price: number;
  rating: number;
}

export async function scrapeInfoFromNaver(placeName: string, region: string): Promise<ScrapedInfo | null> {
  const query = encodeURIComponent(`${placeName} ${region}`);
  const url = `https://search.naver.com/search.naver?query=${query}`;

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

    // 네이버 스마트플레이스 영역 타겟팅
    const placeSection = $('.api_subject_bx, #_pc_common_business_wrapper, ._au_place_list').first();

    // 1. 평점 추출
    const ratingText = placeSection.find('.rating, .score, ._rating').text().replace(/[^0-9.]/g, '').trim();
    rating = parseFloat(ratingText.split(' ')[0]) || 0;

    // 2. 메뉴 및 가격 추출
    // 네이버는 메뉴 정보가 복잡한 구조로 되어 있는 경우가 많음
    const menuList = placeSection.find('.list_menu li, .menu_item, ._menu_item');
    
    if (menuList.length > 0) {
      const firstMenu = $(menuList[0]);
      menuName = firstMenu.find('.name, .tit, ._name').text().trim();
      const priceText = firstMenu.find('.price, ._price').text().trim();
      price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
    }

    // 대체 수단: 전체 텍스트에서 검색
    if (!menuName) {
      $('.name, ._name').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 1 && text.length < 20) {
           menuName = text;
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
