import React from 'react';
import styles from './RestaurantCard.module.css';
import { Restaurant } from '../types/restaurant';

interface Props {
  restaurant: Restaurant;
}

export const RestaurantCard: React.FC<Props> = ({ restaurant }) => {
  const { name, signatureMenu, priceAverage, distance, isOpen, isBreakTime } = restaurant;

  const renderStatusBadge = () => {
    if (isBreakTime) return <span className={`${styles.badge} ${styles.breakTime}`}>브레이크 타임</span>;
    if (!isOpen) return <span className={`${styles.badge} ${styles.closed}`}>영업 종료</span>;
    return <span className={`${styles.badge} ${styles.open}`}>영업 중</span>;
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.name}>{name}</h3>
        {renderStatusBadge()}
      </div>
      
      <div className={styles.details}>
        <div className={styles.infoRow}>
          <span className={styles.icon}>🍽️</span>
          <span className={styles.menuName}>{signatureMenu}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.icon}>💰</span>
          <span className={styles.price}>{priceAverage.toLocaleString()}원</span>
        </div>
      </div>
      
      <div className={styles.footer}>
        <span className={styles.distance}>📍 내 위치에서 {distance}m</span>
      </div>
    </div>
  );
};
