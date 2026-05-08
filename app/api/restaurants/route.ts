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
    
    // 카카오 카테고리 검색은 최대 3페이지(각 15개)까지 제공함
    for (let page = 1; page <= 3; page++) {
      const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&y=${lat}&x=${lng}&radius=${radius}&sort=distance&size=15&page=${page}`;

      const response = await fetch(url, {
        headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
        cache: 'no-store'
      });

      if (!response.ok) break;

      const data = await response.json();
      if (data.documents) {
        allDocuments = [...allDocuments, ...data.documents];
      }
      
      if (data.meta?.is_end) break;
    }

    // "밥집만" 나오게 필터링 (카페, 술집 등 제외)
    const excludeKeywords = ['카페', '커피', '전문점', '주점', '술집', '보드게임', '디저트', '베이커리'];
    
    const filteredRestaurants = allDocuments
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

    return NextResponse.json({ data: filteredRestaurants });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
