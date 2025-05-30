import React, { useState } from 'react';
import scoresData from '../data/scores.json';

const placements = [
    { label: '1st Place', points: 4 },
    { label: '2nd Place', points: 3 },
    { label: '3rd Place', points: 2 },
    { label: '4th Place', points: 1 },
];

const PencilIcon = ({ size = 18 }) => (
    <svg height={size} width={size} viewBox="0 0 20 20" fill="#7ecfff" style={{ verticalAlign: 'middle' }}>
        <path d="M14.69 2.86a2.1 2.1 0 0 1 2.97 2.97l-1.13 1.13-2.97-2.97 1.13-1.13zm-2.12 2.12l2.97 2.97-8.49 8.49c-.13.13-.29.22-.47.25l-3.01.5c-.36.06-.68-.26-.62-.62l.5-3.01c.03-.18.12-.34.25-.47l8.49-8.49z"/>
    </svg>
);

const ScoreBoard = ({ scores, updateScore, updatePlayerName }) => {
    const [editIdx, setEditIdx] = useState(null);
    const [editValue, setEditValue] = useState("");

    const handleEdit = (idx, currentName) => {
        setEditIdx(idx);
        setEditValue(currentName);
    };

    const handleSave = idx => {
        updatePlayerName(idx, editValue);
        setEditIdx(null);
        setEditValue("");
    };

    return (
        <div>
            <h2>Score Board</h2>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '24px',
                maxWidth: 1100,
                margin: '0 auto',
            }}>
                {[0, 1].map(col => (
                    <ul key={col} style={{ flex: 1, minWidth: 320, maxWidth: 500, padding: 0 }}>
                        {scores.players
                            .filter((_, idx) => idx % 2 === col)
                            .map((player, idxInCol) => {
                                const idx = col + idxInCol * 2;
                                return (
                                    <li key={player.name + idx}>
                                        <div className="player-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {editIdx === idx ? (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        style={{
                                                            fontSize: '1.1rem',
                                                            fontWeight: 600,
                                                            color: '#7ecfff',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            borderBottom: '1.5px solid #7ecfff',
                                                            outline: 'none',
                                                            width: '80%',
                                                            textAlign: 'center',
                                                            marginBottom: '6px',
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleSave(idx)}
                                                        style={{ marginLeft: 8, background: '#4f8cff', color: '#fff', borderRadius: 4, padding: '2px 10px', fontSize: 14 }}
                                                    >
                                                        Save
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span>{player.name}</span>
                                                    <button
                                                        onClick={() => handleEdit(idx, player.name)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6, padding: 0 }}
                                                        aria-label="Edit name"
                                                    >
                                                        <PencilIcon />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        <div className="player-score">{player.score} points</div>
                                        <div className="button-row">
                                            {placements.map((placement, pIdx) => (
                                                <React.Fragment key={placement.label}>
                                                    <button
                                                        onClick={() => updateScore(idx, pIdx + 1)}
                                                    >
                                                        +{placement.points} {placement.label}
                                                    </button>
                                                    <button
                                                        onClick={() => updateScore(idx, pIdx + 1, true)}
                                                        style={{ background: '#ff4f4f', color: '#fff' }}
                                                    >
                                                        -{placement.points}
                                                    </button>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </li>
                                );
                            })}
                    </ul>
                ))}
            </div>
        </div>
    );
};

export default ScoreBoard;