import React from 'react';
import styles from './NavBar.module.css';
import logo from './logo.png';

interface NavBarProps {
  links: Array<{ label: string; href: string }>;
}

/**
 * NavBar component for navigation links.
 * Accessible and responsive.
 */

/**
 * 𝗧𝗜𝗣: Site Logo
 * The logo is a visual anchor for your brand or app. Placing it in the NavBar helps users quickly identify your site and provides a consistent experience.
 */
const NavBar: React.FC<NavBarProps> = ({ links }) => (
  <nav className={styles.nav} aria-label="Main Navigation">
    <img src={logo} alt="Magic EDH Logo" className={styles.logo} />
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
