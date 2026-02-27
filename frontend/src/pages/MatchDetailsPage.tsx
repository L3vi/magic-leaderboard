import React, { useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DetailsPageShell from "../components/DetailsPageShell/DetailsPageShell";
import { useCubeEvent } from "../context/CubeEventContext";
import { getMatchWinner } from "../utils/standings";
import ColorCircles from "../components/ColorCircles/ColorCircles";
import type { Player, ManaColor, MatchPlayer } from "../types";
import { MANA_COLOR_NAMES } from "../types";

const MANA_PILL_STYLES: Record<ManaColor, { bg: string; text: string; border: string }> = {
  W: { bg: "#fffbeb", text: "#78350f", border: "rgba(255, 251, 235, 0.3)" },
  U: { bg: "#0ea5e9", text: "#ffffff", border: "rgba(14, 165, 233, 0.3)" },
  B: { bg: "#4b5563", text: "#e5e7eb", border: "rgba(107, 114, 128, 0.3)" },
  R: { bg: "#ef4444", text: "#ffffff", border: "rgba(239, 68, 68, 0.3)" },
  G: { bg: "#22c55e", text: "#ffffff", border: "rgba(34, 197, 94, 0.3)" },
};

const adjustWins = (current: number, delta: number): number =>
  Math.max(0, Math.min(2, current + delta));

const MatchDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { matchId } = useParams<{ matchId: string }>();
  const { event, players, updateMatch, deleteMatch } = useCubeEvent();
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editP1Wins, setEditP1Wins] = useState(0);
  const [editP2Wins, setEditP2Wins] = useState(0);
  const [editP1Colors, setEditP1Colors] = useState<ManaColor[]>([]);
  const [editP2Colors, setEditP2Colors] = useState<ManaColor[]>([]);
  const [editP1Strategy, setEditP1Strategy] = useState("");
  const [editP2Strategy, setEditP2Strategy] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const match = useMemo(
    () => event?.matches.find(m => m.id === matchId),
    [event, matchId]
  );

  const playerLookup = useMemo(() => {
    const lookup: Record<string, Player> = {};
    for (const p of players) lookup[p.id] = p;
    return lookup;
  }, [players]);

  const draftName = useMemo(() => {
    if (!event || !match) return "";
    const draft = event.drafts.find(d => d.id === match.draftId);
    if (!draft) return match.draftId;
    const cube = event.cubes.find(c => c.id === draft.cubeId);
    const cubeDraftNum = event.drafts
      .filter(d => d.cubeId === draft.cubeId)
      .findIndex(d => d.id === draft.id) + 1;
    return `${cube?.name || draft.cubeId} Draft #${cubeDraftNum}`;
  }, [event, match]);

  const startEditing = useCallback(() => {
    if (!match) return;
    const [mp1, mp2] = match.players;
    setEditP1Wins(mp1.wins);
    setEditP2Wins(mp2.wins);
    setEditP1Colors(mp1.deckColors || []);
    setEditP2Colors(mp2.deckColors || []);
    setEditP1Strategy(mp1.deckStrategy || "");
    setEditP2Strategy(mp2.deckStrategy || "");
    setEditNotes(match.notes || "");
    setIsEditing(true);
  }, [match]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!matchId || !match) return;
    if (editP1Wins === 0 && editP2Wins === 0) {
      alert("At least one player must have wins.");
      return;
    }
    setIsSaving(true);
    try {
      const [origP1, origP2] = match.players;
      const updatedPlayers: [MatchPlayer, MatchPlayer] = [
        {
          playerId: origP1.playerId,
          wins: editP1Wins,
          ...(editP1Colors.length > 0 && { deckColors: editP1Colors }),
          ...(editP1Strategy && { deckStrategy: editP1Strategy }),
        },
        {
          playerId: origP2.playerId,
          wins: editP2Wins,
          ...(editP2Colors.length > 0 && { deckColors: editP2Colors }),
          ...(editP2Strategy && { deckStrategy: editP2Strategy }),
        },
      ];
      await updateMatch(matchId, {
        players: updatedPlayers,
        notes: editNotes || undefined,
      });
      setIsEditing(false);
    } catch {
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [matchId, match, editP1Wins, editP2Wins, editP1Colors, editP2Colors, editP1Strategy, editP2Strategy, editNotes, updateMatch]);

  if (!match) {
    return (
      <DetailsPageShell title="Match" onClose={() => navigate(-1)}>
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--danger)" }}>Match not found.</div>
      </DetailsPageShell>
    );
  }

  const [p1, p2] = match.players;
  const winnerId = getMatchWinner(match);
  const p1Name = playerLookup[p1.playerId]?.name || p1.playerId;
  const p2Name = playerLookup[p2.playerId]?.name || p2.playerId;

  const renderColorPills = (colors: ManaColor[]) => (
    <div style={{ display: "flex", justifyContent: "center", gap: "0.25rem", flexWrap: "wrap" }}>
      {colors.map(c => {
        const s = MANA_PILL_STYLES[c];
        return (
          <span key={c} style={{
            fontSize: "var(--font-size-xs)",
            padding: "0.125rem 0.5rem",
            borderRadius: "var(--radius-full)",
            background: s.bg,
            border: `1px solid ${s.border}`,
            color: s.text,
            fontWeight: 600,
          }}>
            {MANA_COLOR_NAMES[c]}
          </span>
        );
      })}
    </div>
  );

  const renderWinCounter = (wins: number, setWins: (v: number) => void) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
      <button
        type="button"
        onClick={() => setWins(adjustWins(wins, -1))}
        disabled={wins === 0}
        style={{
          width: "2rem", height: "2rem", borderRadius: "var(--radius-full)",
          border: "1.5px solid var(--border)", background: "var(--surface)",
          color: "var(--foreground)", fontSize: "1.25rem", cursor: wins === 0 ? "not-allowed" : "pointer",
          opacity: wins === 0 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        -
      </button>
      <span style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--accent)" }}>{wins}</span>
      <button
        type="button"
        onClick={() => setWins(adjustWins(wins, 1))}
        disabled={wins === 2}
        style={{
          width: "2rem", height: "2rem", borderRadius: "var(--radius-full)",
          border: "1.5px solid var(--border)", background: "var(--surface)",
          color: "var(--foreground)", fontSize: "1.25rem", cursor: wins === 2 ? "not-allowed" : "pointer",
          opacity: wins === 2 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        +
      </button>
    </div>
  );

  return (
    <DetailsPageShell
      title="Match Details"
      onClose={() => navigate(-1)}
      onEdit={isEditing ? undefined : startEditing}
    >
      <div style={{ padding: "0.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1rem", color: "var(--text-muted)", fontSize: "var(--font-size-sm)" }}>
          {draftName} · {new Date(match.date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          {/* Player 1 */}
          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              onClick={!isEditing ? () => navigate(`/players/${encodeURIComponent(p1Name)}`) : undefined}
              role={!isEditing ? "link" : undefined}
              style={{
                fontSize: "var(--font-size-lg)",
                fontWeight: !isEditing && winnerId === p1.playerId ? 700 : 400,
                color: !isEditing && winnerId === p1.playerId ? "var(--accent)" : "var(--foreground)",
                marginBottom: "0.5rem",
                ...(!isEditing && { cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--border)", textUnderlineOffset: "0.2em" }),
              }}
            >
              {p1Name}
            </div>
            {isEditing ? (
              <>
                {renderWinCounter(editP1Wins, setEditP1Wins)}
                <div style={{ marginBottom: "0.5rem" }}>
                  <ColorCircles selected={editP1Colors} onChange={setEditP1Colors} size="sm" />
                </div>
                <input
                  type="text"
                  value={editP1Strategy}
                  onChange={e => setEditP1Strategy(e.target.value)}
                  placeholder="Strategy"
                  style={{
                    width: "100%", padding: "0.375rem 0.5rem", fontSize: "var(--font-size-xs)",
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)", color: "var(--foreground)", textAlign: "center",
                  }}
                />
              </>
            ) : (
              <>
                <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.75rem" }}>
                  {p1.wins}
                </div>
                {renderColorPills(p1.deckColors || [])}
                {p1.deckStrategy && (
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: "0.375rem", fontStyle: "italic" }}>
                    {p1.deckStrategy}
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", paddingTop: "1.5rem", color: "var(--text-muted)", fontWeight: 600 }}>
            vs
          </div>

          {/* Player 2 */}
          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              onClick={!isEditing ? () => navigate(`/players/${encodeURIComponent(p2Name)}`) : undefined}
              role={!isEditing ? "link" : undefined}
              style={{
                fontSize: "var(--font-size-lg)",
                fontWeight: !isEditing && winnerId === p2.playerId ? 700 : 400,
                color: !isEditing && winnerId === p2.playerId ? "var(--accent)" : "var(--foreground)",
                marginBottom: "0.5rem",
                ...(!isEditing && { cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--border)", textUnderlineOffset: "0.2em" }),
              }}
            >
              {p2Name}
            </div>
            {isEditing ? (
              <>
                {renderWinCounter(editP2Wins, setEditP2Wins)}
                <div style={{ marginBottom: "0.5rem" }}>
                  <ColorCircles selected={editP2Colors} onChange={setEditP2Colors} size="sm" />
                </div>
                <input
                  type="text"
                  value={editP2Strategy}
                  onChange={e => setEditP2Strategy(e.target.value)}
                  placeholder="Strategy"
                  style={{
                    width: "100%", padding: "0.375rem 0.5rem", fontSize: "var(--font-size-xs)",
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)", color: "var(--foreground)", textAlign: "center",
                  }}
                />
              </>
            ) : (
              <>
                <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.75rem" }}>
                  {p2.wins}
                </div>
                {renderColorPills(p2.deckColors || [])}
                {p2.deckStrategy && (
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: "0.375rem", fontStyle: "italic" }}>
                    {p2.deckStrategy}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Notes section */}
        {isEditing ? (
          <div style={{ marginTop: "1.25rem" }}>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem", fontWeight: 600 }}>
              Notes
            </div>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder="Notable plays, memorable moments..."
              rows={3}
              style={{
                width: "100%", padding: "0.5rem 0.75rem", fontSize: "var(--font-size-sm)",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", color: "var(--foreground)", resize: "vertical",
              }}
            />
          </div>
        ) : (
          match.notes && (
            <div style={{
              marginTop: "1.25rem",
              padding: "0.75rem",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-sm)",
              color: "var(--foreground)",
              whiteSpace: "pre-wrap",
            }}>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem", fontWeight: 600 }}>
                Notes
              </div>
              {match.notes}
            </div>
          )
        )}

        {/* Action buttons */}
        {isEditing ? (
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem" }}>
            <button
              type="button"
              onClick={cancelEditing}
              disabled={isSaving}
              style={{
                background: "transparent",
                border: "1.5px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "0.5rem 1.25rem",
                color: "var(--foreground)",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                transition: "all 0.18s",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                background: "var(--primary)",
                border: "1.5px solid var(--primary)",
                borderRadius: "var(--radius-md)",
                padding: "0.5rem 1.25rem",
                color: "#fff",
                cursor: isSaving ? "not-allowed" : "pointer",
                fontSize: "var(--font-size-sm)",
                opacity: isSaving ? 0.5 : 1,
                transition: "all 0.18s",
              }}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        ) : (
          <>
            {/* Link to draft */}
            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <button
                onClick={() => navigate(`/drafts/${match.draftId}`)}
                style={{
                  background: "transparent",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.5rem 1rem",
                  color: "var(--primary-light)",
                  cursor: "pointer",
                  fontSize: "var(--font-size-sm)",
                  transition: "all 0.18s"
                }}
              >
                View Draft Standings →
              </button>
            </div>

            {/* Delete match */}
            <div style={{ textAlign: "center", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
              <button
                onClick={async () => {
                  if (!matchId) return;
                  const ok = window.confirm(`Delete this match (${p1Name} vs ${p2Name})? This cannot be undone.`);
                  if (!ok) return;
                  setIsDeleting(true);
                  try {
                    await deleteMatch(matchId);
                    navigate("/stats", { replace: true });
                  } catch {
                    setIsDeleting(false);
                    alert("Failed to delete match. Please try again.");
                  }
                }}
                disabled={isDeleting}
                style={{
                  background: "transparent",
                  border: "1.5px solid var(--danger)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.5rem 1.25rem",
                  color: "var(--danger)",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  fontSize: "var(--font-size-sm)",
                  opacity: isDeleting ? 0.5 : 1,
                  transition: "all 0.18s"
                }}
              >
                {isDeleting ? "Deleting..." : "Delete Match"}
              </button>
            </div>
          </>
        )}
      </div>
    </DetailsPageShell>
  );
};

export default MatchDetailsPage;
