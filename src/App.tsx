
import React from 'react';
import { ThemeProvider } from './theme/ThemeProvider';
import Header from './components/Header/Header';
import NavBar from './components/NavBar/NavBar';
import Card from './components/Card/Card';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'About', href: '/about' },
];

function App() {
  return (
    <ThemeProvider>
      <Header title="Magic Leaderboard" />
      <NavBar links={navLinks} />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <Card title="Welcome">
          <p>
            This is a modern, scalable, and accessible React app scaffold. Components are modular, themed, and fully typed.
          </p>
        </Card>
        <Card title="Leaderboard">
          <p>
            Future leaderboard data will appear here. Components are ready for extension and testing.
          </p>
        </Card>
      </main>
    </ThemeProvider>
  );
}

export default App;
