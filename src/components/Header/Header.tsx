import React from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
}

/**
 * Header component displays the main title of the app.
 * Accessible and responsive by default.
 */
const Header: React.FC<HeaderProps> = ({ title }) => (
  <header className={styles.header}>
    <h1 tabIndex={0}>{title}</h1>
  </header>
);

export default Header;
