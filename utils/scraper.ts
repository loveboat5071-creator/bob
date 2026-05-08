import * as cheerio from 'cheerio';

export interface ScrapedInfo {
  menuName: string;
  price: number;
  rating: number;
}

export async function scrapeInfoFromNaver(placeName: string, region: string, phone?: string): Promise<ScrapedInfo | null> {
  const query = encodeURIComponent(phone && phone.trim() !== '' ? phone : `${placeName} ${region}`);
  const url = `https://search.naver.com/search.naver?query=${query}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    
    // IP 블래킹이나 캡차 확인용 로그 (서버 로그에서 확인 가능)
    if (html.includes('captcha') || html.includes('정기 점검')) {
      console.warn(`Naver blocked request for ${placeName}`);
      return { menuName: '정보 없음', price: 0, rating: 0 };
    }

    const $ = cheerio.load(html);

    let menuName = '';
    let price = 0;
    let rating = 0;

    // 네이버 스마트플레이스 영역 타겟팅 (전화번호 검색 시 더 정확한 카드가 나옴)
    const placeSection = $('.api_subject_bx, #_pc_common_business_wrapper, ._au_place_list, .main_pack').first();

    // 1. 평점 추출 (다양한 선택자 시도)
    const ratingText = placeSection.find('.rating, .score, ._rating, .L_S_Y, .txt_score').first().text().replace(/[^0-9.]/g, '').trim();
    rating = parseFloat(ratingText.split(' ')[0]) || 0;

    // 2. 메뉴 및 가격 추출
    const menuList = placeSection.find('.list_menu li, .menu_item, ._menu_item, .item_menu');
    
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
