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

    // 카카오 API 응답을 우리 앱의 Restaurant 타입에 맞게 매핑
    const restaurants = data.documents.map((doc: any) => ({
      id: doc.id,
      name: doc.place_name,
      category: doc.category_name.split(' > ').pop() || doc.category_group_name,
      distance: parseInt(doc.distance, 10),
      rating: 0, // 카카오 로컬 API는 기본적으로 평점을 제공하지 않음
      priceAverage: 0, // 가격 정보도 미제공
      signatureMenu: '메뉴 정보 없음', // 대표 메뉴 식별 불가
      isOpen: true, // 영업 상태 실시간 확인 불가 (일단 true)
      isBreakTime: false
    }));

    return NextResponse.json({ data: restaurants });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
