import { NextResponse } from 'next/server';
import { scrapeInfoFromDaum } from '@/utils/scraper';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '150';

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
  }

  const KAKAO_API_KEY = process.env.KAKAO_API_KEY;
  if (!KAKAO_API_KEY) {
    return NextResponse.json({ error: 'Kakao API Key is missing on the server' }, { status: 500 });
  }

  try {
    // 카테고리 검색 (FD6: 음식점)
    // sort=distance (거리순 정렬)
    const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&y=${lat}&x=${lng}&radius=${radius}&sort=distance`;

    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_API_KEY}`
      },
      // 빠른 응답을 위해 캐시 방지 (위치가 계속 바뀔 수 있으므로)
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Kakao API Error:', data);
      return NextResponse.json({ error: 'Failed to fetch from Kakao API' }, { status: response.status });
    }

    // 카카오 API 응답을 기반으로 상세 정보 스크래핑 (병렬 처리)
    const restaurants = await Promise.all(
      data.documents.map(async (doc: any) => {
        const category = doc.category_name.split(' > ').pop() || doc.category_group_name;
        const addressParts = doc.address_name.split(' ');
        const region = addressParts[1] || ''; // '강남구' 등 구 단위 지역명 추출

        // 실시간 스크래핑 수행
        const scraped = await scrapeInfoFromDaum(doc.place_name, region);

        return {
          id: doc.id,
          name: doc.place_name,
          category: category,
          distance: parseInt(doc.distance, 10),
          rating: scraped?.rating || 0,
          priceAverage: scraped?.price || 0,
          signatureMenu: scraped?.menuName || '정보 없음',
          isOpen: true, 
          isBreakTime: false
        };
      })
    );

    return NextResponse.json({ data: restaurants });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
