import { Restaurant, RadiusOption, SortCriterion } from '../types/restaurant';

export async function fetchAndSortRestaurants(
  latitude: number,
  longitude: number,
  radius: RadiusOption,
  sortBy: SortCriterion
): Promise<Restaurant[]> {
  try {
    const res = await fetch(`/api/restaurants?lat=${latitude}&lng=${longitude}&radius=${radius}`);
    
    if (!res.ok) {
      console.error('Failed to fetch restaurants API');
      return [];
    }

    const json = await res.json();
    let fetchedData: Restaurant[] = json.data || [];

    // 카카오 API 응답이 가끔 반경을 살짝 벗어나는 경우가 있어 클라이언트에서 엄격하게 한 번 더 필터링
    fetchedData = fetchedData.filter(rest => rest.distance <= radius);

    fetchedData.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return a.distance - b.distance;
      }
    });

    return fetchedData;
  } catch (err) {
    console.error(err);
    return [];
  }
}
