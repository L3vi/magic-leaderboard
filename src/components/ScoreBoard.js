import React from 'react';

const placements = [
    { label: '1st', field: 'first', color: '#ffd700' },
    { label: '2nd', field: 'second', color: '#c0c0c0' },
    { label: '3rd', field: 'third', color: '#cd7f32' },
    { label: '4th', field: 'fourth', color: '#b3cfff' },
];

// Helper to get games played for a player
const getGamesPlayed = player =>
  (player.first || 0) + (player.second || 0) + (player.third || 0) + (player.fourth || 0);

const ScoreBoard = ({ scores, onPlayerClick, minimal }) => {
    const [sortBy, setSortBy] = React.useState('score');
    const [sortDir, setSortDir] = React.useState('desc');

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
                if (valA === valB) return 0;
                return sortDir === 'asc' ? valA - valB : valB - valA;
            }
            return 0;
        });
        return players;
    }, [scores.players, sortBy, sortDir]);

    return (
        <div className="scoreboard-container">
            <table className="scoreboard-table striped-list">
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
                            Avg
                            <span className="sort-arrow">{sortBy === 'avgScore' && (sortDir === 'asc' ? '▲' : '▼')}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {getSortedPlayers.map((player, i) => {
                        const gamesPlayed = getGamesPlayed(player);
                        const avgScore = gamesPlayed > 0 ? (player.score / gamesPlayed).toFixed(2) : '-';
                        const rowClass = `scoreboard-row${i % 2 === 0 ? ' even' : ' odd'}`;
                        return (
                            <tr
                                key={player.name}
                                className={rowClass}
                                onClick={() => onPlayerClick && onPlayerClick(player)}
                                tabIndex={0}
                                aria-label={`View details for ${player.name}`}
                            >
                                <td className="scoreboard-rank">{i + 1}</td>
                                <td className="scoreboard-player-cell">
                                    <span className="scoreboard-player-name">{player.name}</span>
                                </td>
                                <td className="scoreboard-player-score">{player.score}</td>
                                <td className="scoreboard-player-games">{gamesPlayed}</td>
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