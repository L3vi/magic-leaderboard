import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from './Card';

describe('Card', () => {
  it('renders the title and children', () => {
    render(
      <Card title="Test Card">
        <p>Card content</p>
      </Card>
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test Card');
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('is accessible with aria-label', () => {
    render(<Card title="Accessible Card">Content</Card>);
    expect(screen.getByLabelText('Accessible Card')).toBeInTheDocument();
  });
});
