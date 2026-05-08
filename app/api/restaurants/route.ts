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
    const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&y=${lat}&x=${lng}&radius=${radius}&sort=distance&size=15`;

    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_API_KEY}`
      },
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Kakao API Error:', data);
      return NextResponse.json({ error: 'Failed to fetch from Kakao API' }, { status: response.status });
    }

    const restaurants = data.documents.map((doc: any) => ({
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

    return NextResponse.json({ data: restaurants });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
