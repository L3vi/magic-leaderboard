import React, { useState, useMemo, useCallback } from "react";
import { useCubeEvent } from "../../context/CubeEventContext";
import StaticDropdown from "../StaticDropdown/StaticDropdown";
import ColorCircles from "../ColorCircles/ColorCircles";
import FormActions from "../FormActions/FormActions";
import type { ManaColor, MatchPlayer } from "../../types";
import "./NewMatch.css";

interface NewMatchProps {
  onSubmit: (matchData: { draftId: string; players: [MatchPlayer, MatchPlayer]; notes?: string }) => void | Promise<void>;
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

  // Players available in selected draft, sorted alphabetically
  const draftPlayers = useMemo(() => {
    if (!selectedDraft) return [];
    return players
      .filter(p => selectedDraft.players.includes(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedDraft, players]);

  // Get the two least recently played players in this draft
  const getLeastRecentlyPlayed = useCallback(() => {
    if (!event || !selectedDraftId) return ["", ""];
    const draft = event.drafts.find(d => d.id === selectedDraftId);
    if (!draft) return ["", ""];
    const draftPlayerIds = draft.players;
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
    const sortedPlayers = draftPlayerIds
      .map(id => ({ id, last: lastPlayed[id] || "" }))
      .sort((a, b) => {
        if (!a.last && !b.last) return 0;
        if (!a.last) return -1;
        if (!b.last) return 1;
        return new Date(a.last).getTime() - new Date(b.last).getTime();
      });
    return [sortedPlayers[0]?.id || "", sortedPlayers[1]?.id || ""];
  }, [event, selectedDraftId]);

  // Get a player's last used colors in this draft
  const getLastColors = useCallback((playerId: string): ManaColor[] => {
    if (!event || !selectedDraftId || !playerId) return [];
    const matches = event.matches
      .filter(m => m.draftId === selectedDraftId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const match of matches) {
      const entry = match.players.find(p => p.playerId === playerId);
      if (entry && entry.deckColors && entry.deckColors.length > 0) return entry.deckColors;
    }
    return [];
  }, [event, selectedDraftId]);

  // Get a player's last used strategy in this draft
  const getLastStrategy = useCallback((playerId: string): string => {
    if (!event || !selectedDraftId || !playerId) return "";
    const matches = event.matches
      .filter(m => m.draftId === selectedDraftId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const match of matches) {
      const entry = match.players.find(p => p.playerId === playerId);
      if (entry && entry.deckStrategy) return entry.deckStrategy;
    }
    return "";
  }, [event, selectedDraftId]);

  const initDefaults = useCallback(() => {
    const [p1, p2] = getLeastRecentlyPlayed();
    return {
      p1, p2,
      p1Colors: getLastColors(p1),
      p2Colors: getLastColors(p2),
      p1Strategy: getLastStrategy(p1),
      p2Strategy: getLastStrategy(p2),
    };
  }, [getLeastRecentlyPlayed, getLastColors, getLastStrategy]);

  const [player1Id, setPlayer1Id] = useState(() => initDefaults().p1);
  const [player2Id, setPlayer2Id] = useState(() => initDefaults().p2);
  const [player1Wins, setPlayer1Wins] = useState(0);
  const [player2Wins, setPlayer2Wins] = useState(0);
  const [player1Colors, setPlayer1Colors] = useState<ManaColor[]>(() => initDefaults().p1Colors);
  const [player2Colors, setPlayer2Colors] = useState<ManaColor[]>(() => initDefaults().p2Colors);
  const [player1Strategy, setPlayer1Strategy] = useState(() => initDefaults().p1Strategy);
  const [player2Strategy, setPlayer2Strategy] = useState(() => initDefaults().p2Strategy);
  const [matchNotes, setMatchNotes] = useState("");

  // Reset defaults when draft changes
  React.useEffect(() => {
    const d = initDefaults();
    setPlayer1Id(d.p1);
    setPlayer2Id(d.p2);
    setPlayer1Wins(0);
    setPlayer2Wins(0);
    setPlayer1Colors(d.p1Colors);
    setPlayer2Colors(d.p2Colors);
    setPlayer1Strategy(d.p1Strategy);
    setPlayer2Strategy(d.p2Strategy);
    setMatchNotes("");
  }, [selectedDraftId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill colors + strategy when a player is changed
  const handlePlayer1Change = (id: string) => {
    setPlayer1Id(id);
    setPlayer1Colors(getLastColors(id));
    setPlayer1Strategy(getLastStrategy(id));
  };
  const handlePlayer2Change = (id: string) => {
    setPlayer2Id(id);
    setPlayer2Colors(getLastColors(id));
    setPlayer2Strategy(getLastStrategy(id));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
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
        { playerId: player1Id, deckColors: player1Colors, deckStrategy: player1Strategy, wins: player1Wins },
        { playerId: player2Id, deckColors: player2Colors, deckStrategy: player2Strategy, wins: player2Wins },
      ] as [MatchPlayer, MatchPlayer],
      notes: matchNotes || undefined,
    };
    try {
      await Promise.resolve(onSubmit(matchData));
    } finally {
      setIsSubmitting(false);
    }
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
            onChange={handlePlayer1Change}
            options={playerOptions}
            placeholder="Select player"
          />
          <div className="match-colors-section">
            <ColorCircles selected={player1Colors} onChange={setPlayer1Colors} size="md" />
          </div>
          <input
            type="text"
            className="match-strategy-input"
            value={player1Strategy}
            onChange={e => setPlayer1Strategy(e.target.value)}
            placeholder="Deck strategy"
          />
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
            onChange={handlePlayer2Change}
            options={playerOptions}
            placeholder="Select player"
          />
          <div className="match-colors-section">
            <ColorCircles selected={player2Colors} onChange={setPlayer2Colors} size="md" />
          </div>
          <input
            type="text"
            className="match-strategy-input"
            value={player2Strategy}
            onChange={e => setPlayer2Strategy(e.target.value)}
            placeholder="Deck strategy"
          />
        </div>
      </div>

      {/* Match notes */}
      <div className="match-notes-section">
        <label className="field-label">Notes</label>
        <textarea
          className="match-notes-input"
          value={matchNotes}
          onChange={e => setMatchNotes(e.target.value)}
          placeholder="Notable plays, memorable moments..."
          rows={2}
        />
      </div>

      <FormActions
        variant="fixed"
        submitLabel="Save Match"
        loadingText="Saving..."
        onCancel={onCancel}
        isSubmitting={isSubmitting}
      />
    </form>
  );
};

export default NewMatch;
