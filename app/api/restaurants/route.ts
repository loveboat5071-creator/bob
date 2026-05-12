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

  const centerLat = parseFloat(lat);
  const centerLng = parseFloat(lng);
  const radiusNum = parseInt(radius, 10);

  try {
    // ──────────────────────────────────────────────────────
    // 카카오 카테고리 검색 API는 최대 3페이지(45개)까지만 반환합니다.
    // 식당 밀집 지역에서 반경을 넓혀도 45개가 가까운 곳에서 다 차버리는 문제를 해결하기 위해
    // "다중 좌표 그리드 검색" 전략을 사용합니다.
    //
    // 전략: 중심점 + 동서남북 보조 좌표에서 각각 검색 → 합치기 → 중복 제거
    // 이렇게 하면 각 좌표 주변 45개씩 × 여러 좌표 = 수백 개의 식당을 확보할 수 있습니다.
    // ──────────────────────────────────────────────────────

    // 위도 1도 ≈ 111,000m, 경도 1도 ≈ 88,000m (한국 위도 기준)
    const latPerMeter = 1 / 111000;
    const lngPerMeter = 1 / (111000 * Math.cos(centerLat * Math.PI / 180));

    // 검색 좌표 목록 생성: 반경이 200m 이상이면 보조 좌표를 추가
    const searchPoints: Array<{ lat: number; lng: number; searchRadius: number }> = [];

    if (radiusNum <= 200) {
      // 200m 이하: 중심점 하나만으로 충분 (45개면 대부분 커버)
      searchPoints.push({ lat: centerLat, lng: centerLng, searchRadius: radiusNum });
    } else {
      // 200m 초과: 중심점 + 동서남북 보조 좌표 (5개 지점에서 검색)
      const offset = radiusNum * 0.4; // 반경의 40% 거리만큼 오프셋

      searchPoints.push(
        { lat: centerLat, lng: centerLng, searchRadius: radiusNum },                                    // 중심
        { lat: centerLat + latPerMeter * offset, lng: centerLng, searchRadius: radiusNum },              // 북
        { lat: centerLat - latPerMeter * offset, lng: centerLng, searchRadius: radiusNum },              // 남
        { lat: centerLat, lng: centerLng + lngPerMeter * offset, searchRadius: radiusNum },              // 동
        { lat: centerLat, lng: centerLng - lngPerMeter * offset, searchRadius: radiusNum },              // 서
      );
    }

    // 각 좌표에서 모든 페이지를 순회하는 함수
    const fetchAllPagesFromPoint = async (pointLat: number, pointLng: number, searchRadius: number) => {
      const docs: any[] = [];
      let page = 1;
      let isEnd = false;

      while (!isEnd && page <= 45) {
        const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&y=${pointLat}&x=${pointLng}&radius=${searchRadius}&sort=distance&size=15&page=${page}`;
        const response = await fetch(url, {
          headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
          cache: 'no-store'
        });

        if (!response.ok) break;

        const data = await response.json();
        const pageDocs = data.documents || [];
        docs.push(...pageDocs);

        isEnd = data.meta?.is_end ?? true;
        page++;
      }

      return docs;
    };

    // 모든 좌표에서 병렬로 검색 실행
    const allResults = await Promise.all(
      searchPoints.map(p => fetchAllPagesFromPoint(p.lat, p.lng, p.searchRadius))
    );
    const allDocuments = allResults.flat();

    // 중복 제거 (id 기준)
    const uniqueMap = new Map<string, any>();
    for (const doc of allDocuments) {
      if (!uniqueMap.has(doc.id)) {
        uniqueMap.set(doc.id, doc);
      }
    }
    const uniqueDocuments = Array.from(uniqueMap.values());

    // 실제 중심점 기준 거리 재계산 (보조 좌표에서 검색한 결과의 distance는 보조 좌표 기준이므로)
    // 카카오 API가 반환하는 distance 필드는 검색 좌표 기준이므로 중심점 기준으로 다시 계산
    const recalculated = uniqueDocuments.map((doc: any) => {
      const docLat = parseFloat(doc.y);
      const docLng = parseFloat(doc.x);
      const dLat = (docLat - centerLat) * 111000;
      const dLng = (docLng - centerLng) * 111000 * Math.cos(centerLat * Math.PI / 180);
      const realDistance = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
      return { ...doc, realDistance };
    });

    // 사용자가 설정한 반경 내의 식당만 필터 (중심점 기준)
    const withinRadius = recalculated.filter(doc => doc.realDistance <= radiusNum);

    // 필터링: 카페, 술집 등 밥집이 아닌 곳 제외
    const excludeKeywords = ['카페', '커피', '주점', '술집', '보드게임', '디저트', '베이커리', '제과'];
    
    const filteredRestaurants = withinRadius
      .filter((doc: any) => {
        const fullCategory = doc.category_name || '';
        return !excludeKeywords.some(keyword => fullCategory.includes(keyword));
      })
      .map((doc: any) => ({
        id: doc.id,
        name: doc.place_name,
        category: doc.category_name.split(' > ').pop() || doc.category_group_name,
        distance: doc.realDistance,
        phone: doc.phone || '',
        address: doc.road_address_name || doc.address_name || '',
        placeUrl: doc.place_url || `https://place.map.kakao.com/${doc.id}`,
        isOpen: true,
        isBreakTime: false
      }))
      .sort((a: any, b: any) => a.distance - b.distance);

    return NextResponse.json({ 
      data: filteredRestaurants,
      meta: {
        total_returned: filteredRestaurants.length,
        total_raw: allDocuments.length,
        total_unique: uniqueDocuments.length,
        search_points_used: searchPoints.length,
        radius_applied: radiusNum,
        max_distance: filteredRestaurants.length > 0 ? filteredRestaurants[filteredRestaurants.length - 1].distance : 0
      }
    });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
