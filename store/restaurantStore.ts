import { create } from 'zustand';
import { Restaurant } from '../types/restaurant';

interface RestaurantStore {
  restaurants: Restaurant[];
  setRestaurants: (restaurants: Restaurant[]) => void;
}

export const useRestaurantStore = create<RestaurantStore>((set) => ({
  restaurants: [],
  setRestaurants: (restaurants) => set({ restaurants }),
}));
