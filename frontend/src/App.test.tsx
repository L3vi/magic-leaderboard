import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Magic Leaderboard title', () => {
  render(<App />);
  expect(screen.getByText(/Magic Leaderboard/i)).toBeInTheDocument();
});
