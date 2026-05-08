import { NextResponse } from 'next/server';
import { scrapeInfoFromNaver } from '@/utils/scraper';

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

    // 카카오 API 응답을 기반으로 상세 정보 스크래핑 (봇 탐지 회피를 위해 순차 처리 및 지연 시간 도입)
    const restaurants = [];
    for (const doc of data.documents) {
        const category = doc.category_name.split(' > ').pop() || doc.category_group_name;
        const addressParts = doc.address_name.split(' ');
        const region = addressParts[1] || '';

        const scraped = await scrapeInfoFromNaver(doc.place_name, region, doc.phone);
        
        restaurants.push({
          id: doc.id,
          name: doc.place_name,
          category: category,
          distance: parseInt(doc.distance, 10),
          rating: scraped?.rating || 0,
          priceAverage: scraped?.price || 0,
          signatureMenu: scraped?.menuName || '정보 없음',
          isOpen: true, 
          isBreakTime: false
        });

        // 0.1초~0.3초 사이의 미세한 지연 (봇 탐지 회피용)
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    }

    return NextResponse.json({ data: restaurants });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
