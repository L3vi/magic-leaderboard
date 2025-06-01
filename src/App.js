import React, { useState, useEffect } from 'react';
import ScoreBoard from './components/ScoreBoard';
import { db, ref, set, onValue } from './firebase';

const SCORES_PATH = 'scores';

const App = () => {
    const [scores, setScores] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Track if we are using Firebase or local fallback
    const [usingFirebase, setUsingFirebase] = useState(true);
    const [showIndicator, setShowIndicator] = useState(true);

    // Fetch scores from Firebase (live updates)
    useEffect(() => {
        const scoresRef = ref(db, SCORES_PATH);
        const unsubscribe = onValue(scoresRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setScores(data);
                setError(null);
                setLoading(false);
                setUsingFirebase(true);
            } else {
                // Fallback to local JSON if Firebase is empty
                import('./data/scores.json')
                  .then(localData => {
                    setScores(localData.default || localData);
                    setError(null);
                    setLoading(false);
                    setUsingFirebase(false);
                  })
                  .catch(() => {
                    setError('Failed to load scores from both Firebase and local file.');
                    setLoading(false);
                    setUsingFirebase(false);
                  });
            }
        }, (err) => {
            // Fallback to local JSON if Firebase errors
            import('./data/scores.json')
              .then(localData => {
                setScores(localData.default || localData);
                setError(null);
                setLoading(false);
                setUsingFirebase(false);
              })
              .catch(() => {
                setError('Failed to load scores from both Firebase and local file.');
                setLoading(false);
                setUsingFirebase(false);
              });
        });
        return () => unsubscribe();
    }, []);

    // Update score and persist to Firebase
    const updateScore = (playerIdx, placement, isSubtract = false) => {
        if (!scores) return;
        const points = [0, 4, 3, 2, 1];
        const placeFields = [null, 'first', 'second', 'third', 'fourth'];
        const delta = isSubtract ? -points[placement] : points[placement];
        const placeDelta = isSubtract ? -1 : 1;
        const newScores = { ...scores };
        newScores.players = newScores.players.map((player, idx) => {
            if (idx === playerIdx) {
                // Update score and placement count
                const updated = { ...player, score: player.score + delta };
                const placeField = placeFields[placement];
                if (placeField) {
                    updated[placeField] = (updated[placeField] || 0) + placeDelta;
                    if (updated[placeField] < 0) updated[placeField] = 0;
                }
                return updated;
            }
            return player;
        });
        setScores(newScores);
        set(ref(db, SCORES_PATH), newScores);
    };

    // Update player name and persist to Firebase
    const updatePlayerName = (playerIdx, newName) => {
        if (!scores) return;
        const newScores = { ...scores };
        newScores.players = newScores.players.map((player, idx) => {
            if (idx === playerIdx) {
                return { ...player, name: newName };
            }
            return player;
        });
        setScores(newScores);
        set(ref(db, SCORES_PATH), newScores);
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div>
            <h1>MTG Commander Score Tracker</h1>
            <ScoreBoard scores={scores} updateScore={updateScore} updatePlayerName={updatePlayerName} />
            {showIndicator && (
                <div style={{
                    position: 'fixed',
                    left: 0,
                    bottom: 0,
                    width: '100vw',
                    background: usingFirebase ? '#22c55e' : '#f59e42',
                    color: '#fff',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '0.95em',
                    letterSpacing: '0.04em',
                    padding: '6px 0',
                    zIndex: 1000,
                    boxShadow: '0 -2px 8px #0003',
                }}>
                    <span>{usingFirebase ? 'Database: Online (Firebase)' : 'Database: Offline (Local Fallback)'}</span>
                    <button
                        onClick={() => setShowIndicator(false)}
                        aria-label="Hide database status indicator"
                        style={{
                            position: 'absolute',
                            right: 12,
                            top: 4,
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '1.2em',
                            cursor: 'pointer',
                            padding: 0,
                            lineHeight: 1,
                        }}
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
};

export default App;