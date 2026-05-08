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
