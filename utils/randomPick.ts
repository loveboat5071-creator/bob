import { Restaurant } from '../types/restaurant';

export function getRandomPicks(restaurants: Restaurant[], pickCount: number = 3): Restaurant[] {
  const availableRestaurants = restaurants.filter(r => r.isOpen && !r.isBreakTime);
  
  if (availableRestaurants.length <= pickCount) {
    return availableRestaurants;
  }

  const shuffled = [...availableRestaurants];
  
  for (let i = 0; i < pickCount; i++) {
    const randomIndex = i + Math.floor(Math.random() * (shuffled.length - i));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, pickCount);
}
