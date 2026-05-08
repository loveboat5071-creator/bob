import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const KAKAO_API_KEY = process.env.KAKAO_API_KEY;
  if (!KAKAO_API_KEY) {
    return NextResponse.json({ error: 'Kakao API Key is missing' }, { status: 500 });
  }

  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
      cache: 'no-store'
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Geocode API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
