import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Card component for displaying content in a styled container.
 * Accessible and reusable.
 */
const Card: React.FC<CardProps> = ({ title, children }) => (
  <section className={styles.card} aria-label={title}>
    <h2 className={styles.title}>{title}</h2>
    <div className={styles.content}>{children}</div>
  </section>
);

export default Card;
