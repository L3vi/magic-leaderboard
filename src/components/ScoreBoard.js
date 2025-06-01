import React, { useState } from 'react';

const placements = [
    { label: '1st', field: 'first', points: 4, color: '#ffd700' },
    { label: '2nd', field: 'second', points: 3, color: '#c0c0c0' },
    { label: '3rd', field: 'third', points: 2, color: '#cd7f32' },
    { label: '4th', field: 'fourth', points: 1, color: '#b3cfff' },
];

const PencilIcon = ({ size = 18 }) => (
    <svg height={size} width={size} viewBox="0 0 20 20" fill="#7ecfff" style={{ verticalAlign: 'middle' }}>
        <path d="M14.69 2.86a2.1 2.1 0 0 1 2.97 2.97l-1.13 1.13-2.97-2.97 1.13-1.13zm-2.12 2.12l2.97 2.97-8.49 8.49c-.13.13-.29.22-.47.25l-3.01.5c-.36.06-.68-.26-.62-.62l.5-3.01c.03-.18.12-.34.25-.47l8.49-8.49z"/>
    </svg>
);

// Helper to get games played for a player
const getGamesPlayed = player =>
  (player.first || 0) + (player.second || 0) + (player.third || 0) + (player.fourth || 0);

const ScoreBoard = ({ scores, updateScore, updatePlayerName }) => {
    const [editIdx, setEditIdx] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [sortBy, setSortBy] = useState('score');
    const [sortDir, setSortDir] = useState('desc');

    const handleEdit = (idx, currentName) => {
        setEditIdx(idx);
        setEditValue(currentName);
    };

    const handleSave = idx => {
        updatePlayerName(idx, editValue);
        setEditIdx(null);
        setEditValue("");
    };

    const handleSort = (col) => {
        if (sortBy === col) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(col);
            setSortDir(col === 'name' ? 'asc' : 'desc');
        }
    };

    const getSortValue = (player, col) => {
        if (col === 'name') return player.name.toLowerCase();
        if (col === 'avgScore') {
            const gamesPlayed = getGamesPlayed(player);
            return gamesPlayed > 0 ? player.score / gamesPlayed : -Infinity;
        }
        if (col === 'gamesPlayed') {
            return getGamesPlayed(player);
        }
        if (placements.some(p => p.field === col)) {
            return player[col] || 0;
        }
        return player[col] || 0;
    };

    // UseMemo for maxGames
    const maxGames = React.useMemo(
      () => Math.max(...scores.players.map(getGamesPlayed)),
      [scores.players]
    );

    const getSortedPlayers = React.useMemo(() => {
        const players = [...scores.players];
        players.sort((a, b) => {
            const valA = getSortValue(a, sortBy);
            const valB = getSortValue(b, sortBy);
            if (typeof valA === 'string' && typeof valB === 'string') {
                if (valA < valB) return sortDir === 'asc' ? -1 : 1;
                if (valA > valB) return sortDir === 'asc' ? 1 : -1;
                return 0;
            } else if (typeof valA === 'number' && typeof valB === 'number') {
                if (valA === valB) {
                    // Tie-breaker logic
                    if (sortBy === 'score') {
                        // Tie on points: break by average (higher wins)
                        const avgA = getGamesPlayed(a) > 0 ? a.score / getGamesPlayed(a) : -Infinity;
                        const avgB = getGamesPlayed(b) > 0 ? b.score / getGamesPlayed(b) : -Infinity;
                        if (avgA === avgB) return 0;
                        return sortDir === 'asc' ? (avgA - avgB) : (avgB - avgA);
                    } else if (sortBy === 'avgScore') {
                        // Tie on average: break by total points (higher wins)
                        if (a.score === b.score) return 0;
                        return sortDir === 'asc' ? (a.score - b.score) : (b.score - a.score);
                    }
                    return 0;
                } else {
                    return sortDir === 'asc' ? valA - valB : valB - valA;
                }
            }
            return 0;
        });
        return players;
    }, [scores.players, sortBy, sortDir]);

    return (
        <div className="scoreboard-container">
            <table className="scoreboard-table">
                <thead>
                    <tr className="scoreboard-header-row">
                        <th className="scoreboard-rank-header">#</th>
                        <th
                            className="scoreboard-player-header"
                            onClick={() => handleSort('name')}
                        >
                            Player
                            <span className="sort-arrow">{sortBy === 'name' && (sortDir === 'asc' ? '▲' : '▼')}</span>
                        </th>
                        <th
                            className="scoreboard-placement-header scoreboard-placement-header-score"
                            onClick={() => handleSort('score')}
                        >
                            Points
                            <span className="sort-arrow">{sortBy === 'score' && (sortDir === 'asc' ? '▲' : '▼')}</span>
                        </th>
                        {placements.map(p => (
                            <th
                                key={p.label}
                                className={`scoreboard-placement-header scoreboard-placement-header-${p.label.toLowerCase()}`}
                                style={{ color: p.color }}
                                onClick={() => handleSort(p.field)}
                            >
                                {p.label}
                                <span className="sort-arrow">{sortBy === p.field && (sortDir === 'asc' ? '▲' : '▼')}</span>
                            </th>
                        ))}
                        <th
                            className="scoreboard-placement-header scoreboard-placement-header-games"
                            onClick={() => handleSort('gamesPlayed')}
                        >
                            Games
                            <span className="sort-arrow">{sortBy === 'gamesPlayed' && (sortDir === 'asc' ? '▲' : '▼')}</span>
                        </th>
                        <th
                            className="scoreboard-placement-header scoreboard-placement-header-avgscore"
                            onClick={() => handleSort('avgScore')}
                        >
                            Average
                            <span className="sort-arrow">{sortBy === 'avgScore' && (sortDir === 'asc' ? '▲' : '▼')}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {getSortedPlayers.map((player, i) => {
                        const idx = scores.players.findIndex(p => p.name === player.name);
                        const gamesPlayed = getGamesPlayed(player);
                        const inProgress = gamesPlayed < maxGames;
                        const avgScore = gamesPlayed > 0 ? (player.score / gamesPlayed).toFixed(2) : '-';
                        return (
                            <tr key={player.name} className="scoreboard-row">
                                <td className="scoreboard-rank">{i + 1}</td>
                                <td className="scoreboard-player-cell">
                                    {editIdx === idx ? (
                                        <>
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className="scoreboard-player-input"
                                            />
                                            <button
                                                onClick={() => handleSave(idx)}
                                                className="scoreboard-save-btn"
                                            >
                                                Save
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="scoreboard-player-name">{player.name}</span>
                                            <button
                                                onClick={() => handleEdit(idx, player.name)}
                                                className="scoreboard-edit-btn"
                                                aria-label="Edit name"
                                            >
                                                <PencilIcon size={22} />
                                            </button>
                                        </>
                                    )}
                                </td>
                                <td className="scoreboard-player-score">{player.score}</td>
                                {placements.map((placement, pIdx) => (
                                    <td key={placement.label} className={`scoreboard-placement-cell scoreboard-placement-cell-${placement.label.toLowerCase()}`}> 
                                        <div className="scoreboard-placement-flex-row">
                                            <span className="scoreboard-placement-count">{player[placement.field]}</span>
                                            <div className="scoreboard-placement-btns-container">
                                                <button
                                                    onClick={() => updateScore(idx, pIdx + 1)}
                                                    className={`scoreboard-placement-btn scoreboard-placement-btn-plus scoreboard-placement-btn-${placement.label.toLowerCase()}`}
                                                    title={`Add ${placement.label}`}
                                                    aria-label={`Add ${placement.label} for ${player.name}`}
                                                    tabIndex={0}
                                                    disabled={false}
                                                >
                                                    +
                                                </button>
                                                <button
                                                    onClick={() => updateScore(idx, pIdx + 1, true)}
                                                    className={`scoreboard-placement-btn scoreboard-placement-btn-minus scoreboard-placement-btn-${placement.label.toLowerCase()}`}
                                                    title={`Undo ${placement.label}`}
                                                    aria-label={`Undo ${placement.label} for ${player.name}`}
                                                    tabIndex={0}
                                                    disabled={player[placement.field] === 0}
                                                >
                                                    -
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                ))}
                                <td className={`scoreboard-player-games${inProgress ? ' scoreboard-player-games-inprogress' : ''}`}>{gamesPlayed}</td>
                                <td className="scoreboard-player-avgscore">{avgScore}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ScoreBoard;