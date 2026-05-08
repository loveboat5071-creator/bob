export interface Restaurant {
  id: string;
  name: string;
  category: string;
  distance: number;
  phone: string;
  address: string;
  placeUrl: string;
  isOpen: boolean;
  isBreakTime: boolean;
}

export type SortCriterion = 'distance' | 'name';
export type RadiusOption = 50 | 100 | 150 | 200 | 250 | 300 | 400 | 500;
