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

    // 카테고리 기반 임의 메뉴/가격 생성 함수 (API에서 제공하지 않으므로 Mocking)
    const generateMockDetails = (category: string) => {
      const rating = (Math.random() * (4.9 - 3.5) + 3.5).toFixed(1);
      const price = Math.floor(Math.random() * (15 - 7 + 1) + 7) * 1000;
      
      let menu = '대표 메뉴 (현장 확인)';
      if (category.includes('한식')) menu = '김치찌개 정식';
      else if (category.includes('중식')) menu = '짜장면/짬뽕';
      else if (category.includes('일식')) menu = '초밥/돈가스';
      else if (category.includes('양식')) menu = '파스타/스테이크';
      else if (category.includes('분식')) menu = '떡볶이/김밥';
      else if (category.includes('카페')) menu = '아메리카노';
      else if (category.includes('패스트푸드')) menu = '버거 세트';

      return { rating: Number(rating), price, menu };
    };

    // 카카오 API 응답을 우리 앱의 Restaurant 타입에 맞게 매핑
    const restaurants = data.documents.map((doc: any) => {
      const category = doc.category_name.split(' > ').pop() || doc.category_group_name;
      const mock = generateMockDetails(category);
      
      return {
        id: doc.id,
        name: doc.place_name,
        category: category,
        distance: parseInt(doc.distance, 10),
        rating: mock.rating,
        priceAverage: mock.price,
        signatureMenu: mock.menu,
        isOpen: true, // 영업 상태 실시간 확인 불가 (일단 true)
        isBreakTime: false
      };
    });

    return NextResponse.json({ data: restaurants });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
