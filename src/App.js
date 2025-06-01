import React, { useState, useEffect } from 'react';
import ScoreBoard from './components/ScoreBoard';
import { db, ref, set, onValue } from './firebase';
import scores2025 from './data/scores-2025.json';
import scores2024 from './data/scores-2024.json';

const SCORES_PATH = 'scores';

const AVAILABLE_SHEETS = [
  { label: '2025', file: 'scores-2025.json', data: scores2025 },
  { label: '2024', file: 'scores-2024.json', data: scores2024 }
];

const getSheetData = (file) => {
  const found = AVAILABLE_SHEETS.find(sheet => sheet.file === file);
  return found ? found.data : null;
};

const App = () => {
    const [scores, setScores] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [usingFirebase, setUsingFirebase] = useState(true);
    const [showIndicator, setShowIndicator] = useState(true);
    const [selectedSheet, setSelectedSheet] = useState(AVAILABLE_SHEETS[0].file);

    // Fetch scores from Firebase (live updates)
    useEffect(() => {
        setLoading(true);
        setError(null);
        const scoresRef = ref(db, SCORES_PATH);
        const unsubscribe = onValue(scoresRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setScores(data);
                setError(null);
                setLoading(false);
                setUsingFirebase(true);
            } else {
                // Fallback to statically imported local JSON
                const localData = getSheetData(selectedSheet);
                if (localData) {
                  setScores(localData);
                  setError(null);
                  setLoading(false);
                  setUsingFirebase(false);
                } else {
                  setError('Failed to load scores from both Firebase and local file.');
                  setLoading(false);
                  setUsingFirebase(false);
                }
            }
        }, (err) => {
            // Fallback to statically imported local JSON
            const localData = getSheetData(selectedSheet);
            if (localData) {
              setScores(localData);
              setError(null);
              setLoading(false);
              setUsingFirebase(false);
            } else {
              setError('Failed to load scores from both Firebase and local file.');
              setLoading(false);
              setUsingFirebase(false);
            }
        });
        return () => unsubscribe();
    }, [selectedSheet]);

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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <label htmlFor="scoresheet-select" style={{ marginRight: 8, color: '#b3d8ff', fontWeight: 500, fontSize: '1.1rem' }}>Scoresheet:</label>
              <select
                id="scoresheet-select"
                value={selectedSheet}
                onChange={e => setSelectedSheet(e.target.value)}
                style={{ borderRadius: 6, padding: '4px 12px', fontSize: '1.1rem', background: '#263a53', color: '#b3d8ff', border: 'none', outline: 'none' }}
              >
                {AVAILABLE_SHEETS.map(sheet => (
                  <option key={sheet.file} value={sheet.file}>{sheet.label}</option>
                ))}
              </select>
            </div>
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