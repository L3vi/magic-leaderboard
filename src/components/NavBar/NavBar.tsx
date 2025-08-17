import React from 'react';
import styles from './NavBar.module.css';

interface NavBarProps {
  links: Array<{ label: string; href: string }>;
}

/**
 * NavBar component for navigation links.
 * Accessible and responsive.
 */
const NavBar: React.FC<NavBarProps> = ({ links }) => (
  <nav className={styles.nav} aria-label="Main Navigation">
    <ul className={styles.list}>
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} className={styles.link} tabIndex={0}>
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);

export default NavBar;
