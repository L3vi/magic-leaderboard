import React, { useState, useMemo } from "react";
import { useCubeEvent } from "../../context/CubeEventContext";
import StaticDropdown from "../StaticDropdown/StaticDropdown";
import ColorCircles from "../ColorCircles/ColorCircles";
import FormActions from "../FormActions/FormActions";
import type { ManaColor, MatchPlayer } from "../../types";
import "./NewMatch.css";

interface NewMatchProps {
  onSubmit: (matchData: { draftId: string; players: [MatchPlayer, MatchPlayer] }) => void | Promise<void>;
  onCancel?: () => void;
}

const NewMatch: React.FC<NewMatchProps> = ({ onSubmit, onCancel }) => {
  const { event, players } = useCubeEvent();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default to most recent in-progress draft
  const inProgressDrafts = useMemo(
    () => (event?.drafts || []).filter(d => d.status === "in-progress"),
    [event]
  );

  const [selectedDraftId, setSelectedDraftId] = useState<string>(
    inProgressDrafts[inProgressDrafts.length - 1]?.id || ""
  );

  const selectedDraft = useMemo(
    () => event?.drafts.find(d => d.id === selectedDraftId),
    [event, selectedDraftId]
  );

  // Players available in selected draft
  const draftPlayers = useMemo(() => {
    if (!selectedDraft) return [];
    return players.filter(p => selectedDraft.players.includes(p.id));
  }, [selectedDraft, players]);

  // Default to least recently played players in this draft
  const getLeastRecentlyPlayed = () => {
    if (!event || !selectedDraft) return ["", ""];
    const matches = event.matches.filter(m => m.draftId === selectedDraftId);
    const lastPlayed: Record<string, string> = {};
    const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const match of sorted) {
      for (const p of match.players) {
        if (!lastPlayed[p.playerId]) {
          lastPlayed[p.playerId] = match.date;
        }
      }
    }
    const sortedPlayers = draftPlayers
      .map(p => ({ id: p.id, last: lastPlayed[p.id] || "" }))
      .sort((a, b) => {
        if (!a.last && !b.last) return 0;
        if (!a.last) return -1;
        if (!b.last) return 1;
        return new Date(a.last).getTime() - new Date(b.last).getTime();
      });
    return [sortedPlayers[0]?.id || "", sortedPlayers[1]?.id || ""];
  };

  const [defaults] = useState(() => getLeastRecentlyPlayed());
  const [player1Id, setPlayer1Id] = useState(defaults[0]);
  const [player2Id, setPlayer2Id] = useState(defaults[1]);
  const [player1Wins, setPlayer1Wins] = useState(0);
  const [player2Wins, setPlayer2Wins] = useState(0);
  const [player1Colors, setPlayer1Colors] = useState<ManaColor[]>([]);
  const [player2Colors, setPlayer2Colors] = useState<ManaColor[]>([]);

  // Reset player defaults when draft changes
  React.useEffect(() => {
    const [p1, p2] = getLeastRecentlyPlayed();
    setPlayer1Id(p1);
    setPlayer2Id(p2);
    setPlayer1Wins(0);
    setPlayer2Wins(0);
    setPlayer1Colors([]);
    setPlayer2Colors([]);
  }, [selectedDraftId]);

  const draftOptions = useMemo(() => {
    if (!event) return [];
    return event.drafts.map(d => {
      const cube = event.cubes.find(c => c.id === d.cubeId);
      const cubeDraftNum = event.drafts.filter(dr => dr.cubeId === d.cubeId && event.drafts.indexOf(dr) <= event.drafts.indexOf(d)).length;
      return {
        id: d.id,
        label: `${cube?.name || d.cubeId} Draft #${cubeDraftNum}${d.status === "in-progress" ? "" : " (Complete)"}`,
      };
    });
  }, [event]);

  const playerOptions = useMemo(
    () => draftPlayers.map(p => ({ id: p.id, label: p.name })),
    [draftPlayers]
  );

  const adjustWins = (current: number, delta: number): number => {
    return Math.max(0, Math.min(2, current + delta));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDraftId) {
      alert("Please select a draft.");
      return;
    }
    if (!player1Id || !player2Id) {
      alert("Please select both players.");
      return;
    }
    if (player1Id === player2Id) {
      alert("Please select two different players.");
      return;
    }
    if (player1Wins === 0 && player2Wins === 0) {
      alert("At least one player must have wins.");
      return;
    }

    setIsSubmitting(true);
    const matchData = {
      draftId: selectedDraftId,
      players: [
        { playerId: player1Id, deckColors: player1Colors, wins: player1Wins },
        { playerId: player2Id, deckColors: player2Colors, wins: player2Wins },
      ] as [MatchPlayer, MatchPlayer],
    };
    Promise.resolve(onSubmit(matchData)).finally(() => setIsSubmitting(false));
  };

  return (
    <form className="new-match-form" onSubmit={handleSubmit}>
      {/* Draft selector */}
      <div className="match-draft-select">
        <label className="field-label">Draft</label>
        <StaticDropdown
          value={selectedDraftId}
          onChange={setSelectedDraftId}
          options={draftOptions}
          placeholder="Select draft"
        />
      </div>

      {/* Two-column player area */}
      <div className="match-players">
        {/* Player 1 */}
        <div className="match-player-col">
          <div className="match-player-label">Player 1</div>
          <div className="match-win-counter">
            <button
              type="button"
              className="win-btn win-minus"
              onClick={() => setPlayer1Wins(adjustWins(player1Wins, -1))}
              disabled={player1Wins === 0}
              aria-label="Decrease Player 1 wins"
            >
              -
            </button>
            <span className="win-count">{player1Wins}</span>
            <button
              type="button"
              className="win-btn win-plus"
              onClick={() => setPlayer1Wins(adjustWins(player1Wins, 1))}
              disabled={player1Wins === 2}
              aria-label="Increase Player 1 wins"
            >
              +
            </button>
          </div>
          <StaticDropdown
            value={player1Id}
            onChange={setPlayer1Id}
            options={playerOptions}
            placeholder="Select player"
          />
          <div className="match-colors-section">
            <ColorCircles selected={player1Colors} onChange={setPlayer1Colors} size="md" />
          </div>
        </div>

        {/* Divider */}
        <div className="match-vs">vs</div>

        {/* Player 2 */}
        <div className="match-player-col">
          <div className="match-player-label">Player 2</div>
          <div className="match-win-counter">
            <button
              type="button"
              className="win-btn win-minus"
              onClick={() => setPlayer2Wins(adjustWins(player2Wins, -1))}
              disabled={player2Wins === 0}
              aria-label="Decrease Player 2 wins"
            >
              -
            </button>
            <span className="win-count">{player2Wins}</span>
            <button
              type="button"
              className="win-btn win-plus"
              onClick={() => setPlayer2Wins(adjustWins(player2Wins, 1))}
              disabled={player2Wins === 2}
              aria-label="Increase Player 2 wins"
            >
              +
            </button>
          </div>
          <StaticDropdown
            value={player2Id}
            onChange={setPlayer2Id}
            options={playerOptions}
            placeholder="Select player"
          />
          <div className="match-colors-section">
            <ColorCircles selected={player2Colors} onChange={setPlayer2Colors} size="md" />
          </div>
        </div>
      </div>

      <FormActions
        submitLabel="Save Match"
        loadingText="Saving..."
        onCancel={onCancel}
        isSubmitting={isSubmitting}
      />
    </form>
  );
};

export default NewMatch;
