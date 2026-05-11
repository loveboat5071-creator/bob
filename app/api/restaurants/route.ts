import { NextResponse } from 'next/server';

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
    let allDocuments: any[] = [];
    
    // 카카오 API의 결과 제한(한 호출당 최대 45~675개)을 우회하기 위해 
    // 여러 개의 핵심 키워드를 병렬로 검색하여 데이터를 합칩니다.
    const keywords = ['식당', '맛집', '음식점', '밥집'];
    const pageRanges = [1, 2, 3]; // 각 키워드당 3페이지씩 (45개씩) -> 총 180개 후보 확보
    
    const fetchKeywordPage = async (query: string, page: number) => {
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=FD6&y=${lat}&x=${lng}&radius=${radius}&sort=distance&size=15&page=${page}`;
      const response = await fetch(url, {
        headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
        cache: 'no-store'
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.documents || [];
    };

    const searchTasks = [];
    for (const kw of keywords) {
      for (const pg of pageRanges) {
        searchTasks.push(fetchKeywordPage(kw, pg));
      }
    }

    const allResults = await Promise.all(searchTasks);
    allDocuments = allResults.flat();

    // 중복 데이터 제거 (id 기준)
    const uniqueDocuments = Array.from(new Map(allDocuments.map(doc => [doc.id, doc])).values());

    // "밥집만" 나오게 필터링 (카페, 술집 등 제외)
    const excludeKeywords = ['카페', '커피', '전문점', '주점', '술집', '보드게임', '디저트', '베이커리'];
    
    const filteredRestaurants = uniqueDocuments
      .filter((doc: any) => {
        const fullCategory = doc.category_name || '';
        // 카테고리 명칭에 제외 키워드가 포함되지 않은 것만 필터링
        return !excludeKeywords.some(keyword => fullCategory.includes(keyword));
      })
      .map((doc: any) => ({
        id: doc.id,
        name: doc.place_name,
        category: doc.category_name.split(' > ').pop() || doc.category_group_name,
        distance: parseInt(doc.distance, 10),
        phone: doc.phone || '',
        address: doc.road_address_name || doc.address_name || '',
        placeUrl: doc.place_url || `https://place.map.kakao.com/${doc.id}`,
        isOpen: true,
        isBreakTime: false
      }));

    return NextResponse.json({ 
      data: filteredRestaurants,
      meta: {
        total: filteredRestaurants.length,
        radius_applied: radius
      }
    });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
