import { Restaurant, RadiusOption, SortCriterion } from '../types/restaurant';

export async function fetchAndSortRestaurants(
  latitude: number,
  longitude: number,
  radius: RadiusOption,
  sortBy: SortCriterion
): Promise<Restaurant[]> {
  // 테스트를 위한 Mock 데이터
  let mockData: Restaurant[] = [
    { id: '1', name: '김밥천국 역삼점', category: '분식', distance: 120, rating: 4.1, priceAverage: 6000, signatureMenu: '원조김밥', isOpen: true, isBreakTime: false },
    { id: '2', name: '우레옥', category: '한식', distance: 300, rating: 4.8, priceAverage: 15000, signatureMenu: '평양냉면', isOpen: true, isBreakTime: false },
    { id: '3', name: '바스버거', category: '양식', distance: 50, rating: 4.5, priceAverage: 9800, signatureMenu: '바스버거 세트', isOpen: false, isBreakTime: true },
    { id: '4', name: '제주은희네해장국', category: '한식', distance: 250, rating: 4.6, priceAverage: 12000, signatureMenu: '해장국', isOpen: true, isBreakTime: false },
    { id: '5', name: '마라탕공방', category: '중식', distance: 400, rating: 3.9, priceAverage: 11000, signatureMenu: '마라탕', isOpen: true, isBreakTime: false },
    { id: '6', name: '농민백암순대', category: '한식', distance: 150, rating: 4.7, priceAverage: 10000, signatureMenu: '순대국밥', isOpen: true, isBreakTime: false },
    { id: '7', name: '이타다키', category: '일식', distance: 200, rating: 4.2, priceAverage: 14000, signatureMenu: '돈가스 정식', isOpen: true, isBreakTime: false },
  ];

  // 1. 반경 필터링
  let filteredData = mockData.filter(restaurant => restaurant.distance <= radius);

  // 2. 3단 정렬 엔진
  filteredData.sort((a, b) => {
    switch (sortBy) {
      case 'distance':
        return a.distance - b.distance;
      case 'rating':
        return b.rating - a.rating;
      case 'price':
        return a.priceAverage - b.priceAverage;
      default:
        return a.distance - b.distance;
    }
  });

  return filteredData;
}
