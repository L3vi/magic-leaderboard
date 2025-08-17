import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from './Header';

describe('Header', () => {
  it('renders the title', () => {
    render(<Header title="Magic Leaderboard" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Magic Leaderboard');
  });

  it('is accessible by keyboard', () => {
    render(<Header title="Test Title" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('tabIndex', '0');
  });
});
