import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCubeEvent } from "../../context/CubeEventContext";
import { calculateDraftStandings, formatPct, getMatchWinner } from "../../utils/standings";
import type { Player } from "../../types";
import "./DraftDetails.css";

interface DraftDetailsProps {
  draftId: string;
}

const DraftDetails: React.FC<DraftDetailsProps> = ({ draftId }) => {
  const navigate = useNavigate();
  const { event, players, updateDraftStatus } = useCubeEvent();

  const draft = useMemo(
    () => event?.drafts.find(d => d.id === draftId),
    [event, draftId]
  );

  const playerLookup = useMemo(() => {
    const lookup: Record<string, Player> = {};
    for (const p of players) lookup[p.id] = p;
    return lookup;
  }, [players]);

  const draftDisplayName = useMemo(() => {
    if (!event || !draft) return draftId;
    const cube = event.cubes.find(c => c.id === draft.cubeId);
    const cubeDraftNum = event.drafts
      .filter(d => d.cubeId === draft.cubeId)
      .findIndex(d => d.id === draftId) + 1;
    return `${cube?.name || draft.cubeId} Draft #${cubeDraftNum}`;
  }, [event, draft, draftId]);

  const standings = useMemo(() => {
    if (!event || !draft) return [];
    return calculateDraftStandings(draftId, draft.players, event.matches, playerLookup);
  }, [event, draft, draftId, playerLookup]);

  const draftMatches = useMemo(() => {
    if (!event) return [];
    return event.matches
      .filter(m => m.draftId === draftId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [event, draftId]);

  const handleToggleStatus = async () => {
    if (!draft) return;
    const newStatus = draft.status === "in-progress" ? "complete" : "in-progress";
    await updateDraftStatus(draftId, newStatus);
  };

  if (!draft) {
    return <div className="draft-details-error">Draft not found.</div>;
  }

  return (
    <div className="draft-details">
      <div className="draft-details-header-row">
        <h2 className="draft-details-title">{draftDisplayName}</h2>
        <button
          className={`draft-status-toggle ${draft.status}`}
          onClick={handleToggleStatus}
        >
          {draft.status === "in-progress" ? "Mark Complete" : "Reopen"}
        </button>
      </div>

      {/* Standings table */}
      <div className="standings-table-wrapper">
        <table className="standings-table" role="table">
          <thead>
            <tr>
              <th className="standings-col-name">Player</th>
              <th className="standings-col-pts">Pts</th>
              <th className="standings-col-record">W-L-D</th>
              <th className="standings-col-pct">OMW%</th>
              <th className="standings-col-pct">GW%</th>
              <th className="standings-col-pct standings-col-hide-mobile">OGW%</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, idx) => (
              <tr key={s.playerId} className={idx === 0 && s.matchPoints > 0 ? "standings-row-first" : ""}>
                <td className="standings-col-name">
                  <span className={idx === 0 && s.matchPoints > 0 ? "standings-name-first" : ""}>{s.playerName}</span>
                </td>
                <td className="standings-col-pts">{s.matchPoints}</td>
                <td className="standings-col-record">
                  {s.matchRecord.wins}-{s.matchRecord.losses}-{s.matchRecord.draws}
                </td>
                <td className="standings-col-pct">{formatPct(s.omwPct)}</td>
                <td className="standings-col-pct">{formatPct(s.gameWinPct)}</td>
                <td className="standings-col-pct standings-col-hide-mobile">{formatPct(s.ogwPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent matches in this draft */}
      {draftMatches.length > 0 && (
        <div className="draft-matches-section">
          <h3>Matches</h3>
          <div className="draft-matches-list">
            {draftMatches.map(match => {
              const [p1, p2] = match.players;
              const winnerId = getMatchWinner(match);
              const p1Name = playerLookup[p1.playerId]?.name || p1.playerId;
              const p2Name = playerLookup[p2.playerId]?.name || p2.playerId;
              const isDraw = !winnerId;

              // Always put winner on left
              const leftName = winnerId === p2.playerId ? p2Name : p1Name;
              const rightName = winnerId === p2.playerId ? p1Name : p2Name;
              const leftWins = winnerId === p2.playerId ? p2.wins : p1.wins;
              const rightWins = winnerId === p2.playerId ? p1.wins : p2.wins;

              return (
                <div
                  key={match.id}
                  className="draft-match-row clickable"
                  onClick={() => navigate(`/matches/${match.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter") navigate(`/matches/${match.id}`); }}
                >
                  <span className={`match-player-name${!isDraw && winnerId ? " winner" : ""}`}>
                    {leftName}
                  </span>
                  <span className="match-score">{leftWins} - {rightWins}</span>
                  <span className="match-player-name">{rightName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftDetails;
