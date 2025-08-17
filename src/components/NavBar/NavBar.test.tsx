import React from 'react';
import { render, screen } from '@testing-library/react';
import NavBar from './NavBar';

const links = [
  { label: 'Home', href: '/' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'About', href: '/about' },
];

describe('NavBar', () => {
  it('renders all navigation links', () => {
    render(<NavBar links={links} />);
    links.forEach((link) => {
      expect(screen.getByText(link.label)).toBeInTheDocument();
    });
  });

  it('links are accessible by keyboard', () => {
    render(<NavBar links={links} />);
    links.forEach((link) => {
      expect(screen.getByText(link.label)).toHaveAttribute('tabIndex', '0');
    });
  });
});
