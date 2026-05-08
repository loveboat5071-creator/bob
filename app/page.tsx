'use client';

import React, { useState, useEffect } from 'react';
import { RestaurantCard } from '../components/RestaurantCard';
import { fetchAndSortRestaurants } from '../utils/api';
import { getRandomPicks } from '../utils/randomPick';
import { Restaurant, RadiusOption, SortCriterion } from '../types/restaurant';

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [radius, setRadius] = useState<RadiusOption>(150);
  const [sortBy, setSortBy] = useState<SortCriterion>('distance');
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // 1. 사용자 현재 위치 가져오기
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLoading(false);
        },
        (error) => {
          console.error("위치 정보를 가져오는데 실패했습니다:", error);
          setLocationError("위치 정보를 가져올 수 없어 기본 위치(강남역)로 보여집니다.");
          setLocation({ lat: 37.498095, lng: 127.027610 }); // 강남역
          setIsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocationError("이 브라우저는 위치 정보를 지원하지 않습니다.");
      setLocation({ lat: 37.498095, lng: 127.027610 });
      setIsLoading(false);
    }
  }, []);

  // 2. 위치, 반경, 정렬 기준이 바뀔 때마다 식당 목록 업데이트
  useEffect(() => {
    if (location) {
      fetchAndSortRestaurants(location.lat, location.lng, radius, sortBy)
        .then(data => setRestaurants(data));
    }
  }, [radius, sortBy, location]);

  const handleRandomPick = () => {
    if (!isRandomMode) {
      setRestaurants(prev => getRandomPicks(prev, 3));
      setIsRandomMode(true);
    } else if (location) {
      // 복구
      fetchAndSortRestaurants(location.lat, location.lng, radius, sortBy)
        .then(data => {
          setRestaurants(data);
          setIsRandomMode(false);
        });
    }
  };

  return (
    <div className="home-wrapper">
      <header className="header">
        <h1>오점뭐</h1>
        <p>오늘 점심 뭐 먹지? 반경 500m 내 초근접성 솔루션</p>
      </header>

      <section className="controls">
        <div className="control-group">
          <label>반경 필터</label>
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value) as RadiusOption)}>
            <option value={50}>50m (코앞)</option>
            <option value={100}>100m (도보 2분)</option>
            <option value={150}>150m (도보 3분)</option>
            <option value={200}>200m</option>
            <option value={250}>250m</option>
            <option value={300}>300m</option>
            <option value={400}>400m</option>
            <option value={500}>500m</option>
          </select>
        </div>

        <div className="control-group">
          <label>정렬 기준</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortCriterion)}>
            <option value="distance">거리순</option>
            <option value="rating">평점순</option>
            <option value="price">가격순</option>
          </select>
        </div>
      </section>

      <div className="random-pick-section">
         <button className={`btn-random ${isRandomMode ? 'active' : ''}`} onClick={handleRandomPick}>
          {isRandomMode ? '🎲 전체 목록 보기' : '🎲 아무거나 3곳 랜덤 픽'}
        </button>
      </div>

      <section className="list-section">
        {isLoading ? (
          <div className="empty-state">위치 정보를 스캔 중입니다... 📍</div>
        ) : (
          <>
            {locationError && <div style={{ color: '#C62828', fontSize: '13px', textAlign: 'center', marginBottom: '12px', background: '#FFEBEE', padding: '8px', borderRadius: '8px' }}>{locationError}</div>}
            {restaurants.length > 0 ? (
              restaurants.map(rest => (
                <RestaurantCard key={rest.id} restaurant={rest} />
              ))
            ) : (
              <div className="empty-state">해당 반경 내에 검색된 식당이 없습니다.</div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
