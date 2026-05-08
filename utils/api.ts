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

    // 2. 3단 정렬 엔진 (거리는 이미 카카오API에서 정렬되어 올 수 있지만, 여기서 다시 한 번 보장)
    fetchedData.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'rating':
          return b.rating - a.rating; // (카카오 API에서는 기본 제공 안됨)
        case 'price':
          return a.priceAverage - b.priceAverage; // (카카오 API에서는 기본 제공 안됨)
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
