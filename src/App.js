import React, { useState, useEffect } from 'react';
import ScoreBoard from './components/ScoreBoard';

const API_URL = 'http://localhost:4000/api/scores';

const App = () => {
    const [scores, setScores] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch scores from backend
    useEffect(() => {
        fetch(API_URL)
            .then(res => res.json())
            .then(data => {
                setScores(data);
                setLoading(false);
            })
            .catch(err => {
                setError('Failed to load scores.');
                setLoading(false);
            });
    }, []);

    // Update score and persist to backend
    const updateScore = (playerIdx, placement, isSubtract = false) => {
        const points = [0, 4, 3, 2, 1];
        const delta = isSubtract ? -points[placement] : points[placement];
        const newScores = { ...scores };
        newScores.players = newScores.players.map((player, idx) => {
            if (idx === playerIdx) {
                return { ...player, score: player.score + delta };
            }
            return player;
        });
        setScores(newScores);
        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newScores)
        });
    };

    // Update player name and persist to backend
    const updatePlayerName = (playerIdx, newName) => {
        const newScores = { ...scores };
        newScores.players = newScores.players.map((player, idx) => {
            if (idx === playerIdx) {
                return { ...player, name: newName };
            }
            return player;
        });
        setScores(newScores);
        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newScores)
        });
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div>
            <h1>MTG Commander Score Tracker</h1>
            <ScoreBoard scores={scores} updateScore={updateScore} updatePlayerName={updatePlayerName} />
        </div>
    );
};

export default App;