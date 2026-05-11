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
    
    // 카카오 카테고리 검색은 최대 45페이지까지 지원합니다.
    // 성능과 누락 방지를 위해 30페이지(450개)를 병렬로 한꺼번에 가져옵니다. 
    // 이를 통해 500m 반경 내 수백 개의 식당이 있는 초밀집 지역에서도 누락 없이 모든 데이터를 확보할 수 있습니다.
    const pageRanges = Array.from({ length: 30 }, (_, i) => i + 1);
    
    const fetchPage = async (page: number) => {
      // category.json 대신 keyword.json을 사용하여 더 많은 결과(최대 45페이지)를 가져올 수 있도록 함
      // query 파라미터가 필수이므로 '식당'으로 설정하고 category_group_code를 FD6(음식점)으로 지정
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent('식당')}&category_group_code=FD6&y=${lat}&x=${lng}&radius=${radius}&sort=distance&size=15&page=${page}`;
      const response = await fetch(url, {
        headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
        cache: 'no-store'
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.documents || [];
    };

    const results = await Promise.all(pageRanges.map(page => fetchPage(page)));
    allDocuments = results.flat();

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

    return NextResponse.json({ data: filteredRestaurants });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
