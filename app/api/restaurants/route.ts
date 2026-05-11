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
    // ──────────────────────────────────────────────────────
    // 카카오 카테고리 검색 API (category.json)
    // - FD6 = 음식점 카테고리 전체 (키워드 매칭 아님)
    // - while 루프로 is_end === true 가 될 때까지 모든 페이지 순회
    // - 카카오 API 제한: page 1~45, size 1~15
    // ──────────────────────────────────────────────────────
    let allDocuments: any[] = [];
    let page = 1;
    let isEnd = false;

    while (!isEnd && page <= 45) {
      const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&y=${lat}&x=${lng}&radius=${radius}&sort=distance&size=15&page=${page}`;

      const response = await fetch(url, {
        headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
        cache: 'no-store'
      });

      if (!response.ok) {
        console.error(`Kakao API error at page ${page}:`, response.status);
        break;
      }

      const data = await response.json();
      const docs = data.documents || [];
      allDocuments = [...allDocuments, ...docs];

      // 카카오 API의 meta.is_end가 true이면 더 이상 페이지 없음
      isEnd = data.meta?.is_end ?? true;

      // 디버그 로그 (Vercel Function Logs에서 확인 가능)
      console.log(`[restaurants] page=${page}, docs=${docs.length}, total_so_far=${allDocuments.length}, is_end=${isEnd}, pageable_count=${data.meta?.pageable_count}, total_count=${data.meta?.total_count}`);

      page++;
    }

    // 중복 제거 (동일 id)
    const uniqueMap = new Map<string, any>();
    for (const doc of allDocuments) {
      if (!uniqueMap.has(doc.id)) {
        uniqueMap.set(doc.id, doc);
      }
    }
    const uniqueDocuments = Array.from(uniqueMap.values());

    // 필터링: 카페, 술집 등 밥집이 아닌 곳 제외
    // 주의: '전문점'은 제외하지 않음 (삼겹살전문점, 곱창전문점 등 정상 식당이 걸림)
    const excludeKeywords = ['카페', '커피', '주점', '술집', '보드게임', '디저트', '베이커리', '제과'];
    
    const filteredRestaurants = uniqueDocuments
      .filter((doc: any) => {
        const fullCategory = doc.category_name || '';
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
        total_returned: filteredRestaurants.length,
        total_raw: allDocuments.length,
        total_unique: uniqueDocuments.length,
        pages_fetched: page - 1,
        radius_applied: radius
      }
    });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
