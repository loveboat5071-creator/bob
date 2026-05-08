import React from 'react';
import styles from './RestaurantCard.module.css';
import { Restaurant } from '../types/restaurant';

interface Props {
  restaurant: Restaurant;
}

export const RestaurantCard: React.FC<Props> = ({ restaurant }) => {
  const { name, category, phone, distance, placeUrl, address } = restaurant;

  return (
    <a href={placeUrl} target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.name}>{name}</h3>
          <span className={styles.categoryBadge}>{category}</span>
        </div>
        
        <div className={styles.details}>
          {address && (
            <div className={styles.infoRow}>
              <span className={styles.icon}>📍</span>
              <span>{address}</span>
            </div>
          )}
          {phone && (
            <div className={styles.infoRow}>
              <span className={styles.icon}>📞</span>
              <span>{phone}</span>
            </div>
          )}
        </div>
        
        <div className={styles.footer}>
          <span className={styles.distance}>🚶 {distance}m</span>
          <span className={styles.viewDetail}>메뉴·가격 보기 →</span>
        </div>
      </div>
    </a>
  );
};
