export interface Restaurant {
  id: string;
  name: string;
  category: string;
  distance: number;
  rating: number;
  priceAverage: number;
  signatureMenu: string;
  isOpen: boolean;
  isBreakTime: boolean;
}

export type SortCriterion = 'distance' | 'rating' | 'price';
export type RadiusOption = 50 | 100 | 150 | 200 | 250 | 300 | 400 | 500;
