import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DetailsPageShell from "../components/DetailsPageShell/DetailsPageShell";
import { useCubeEvent } from "../context/CubeEventContext";
import { getMatchWinner } from "../utils/standings";
import ColorCircles from "../components/ColorCircles/ColorCircles";
import type { Player, ManaColor } from "../types";
import { MANA_COLOR_NAMES } from "../types";

const MANA_PILL_STYLES: Record<ManaColor, { bg: string; text: string; border: string }> = {
  W: { bg: "#fffbeb", text: "#78350f", border: "rgba(255, 251, 235, 0.3)" },
  U: { bg: "#0ea5e9", text: "#ffffff", border: "rgba(14, 165, 233, 0.3)" },
  B: { bg: "#4b5563", text: "#e5e7eb", border: "rgba(107, 114, 128, 0.3)" },
  R: { bg: "#ef4444", text: "#ffffff", border: "rgba(239, 68, 68, 0.3)" },
  G: { bg: "#22c55e", text: "#ffffff", border: "rgba(34, 197, 94, 0.3)" },
};

const MatchDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { matchId } = useParams<{ matchId: string }>();
  const { event, players, deleteMatch } = useCubeEvent();
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <DetailsPageShell title="Match Details" onClose={() => navigate(-1)}>
      <div style={{ padding: "0.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1rem", color: "var(--text-muted)", fontSize: "var(--font-size-sm)" }}>
          {draftName} · {new Date(match.date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          {/* Player 1 */}
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: winnerId === p1.playerId ? 700 : 400,
              color: winnerId === p1.playerId ? "var(--accent)" : "var(--foreground)",
              marginBottom: "0.5rem"
            }}>
              {p1Name}
            </div>
            <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.75rem" }}>
              {p1.wins}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.25rem", flexWrap: "wrap" }}>
              {(p1.deckColors || []).map(c => {
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
            {p1.deckStrategy && (
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: "0.375rem", fontStyle: "italic" }}>
                {p1.deckStrategy}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", paddingTop: "1.5rem", color: "var(--text-muted)", fontWeight: 600 }}>
            vs
          </div>

          {/* Player 2 */}
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: winnerId === p2.playerId ? 700 : 400,
              color: winnerId === p2.playerId ? "var(--accent)" : "var(--foreground)",
              marginBottom: "0.5rem"
            }}>
              {p2Name}
            </div>
            <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.75rem" }}>
              {p2.wins}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.25rem", flexWrap: "wrap" }}>
              {(p2.deckColors || []).map(c => {
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
            {p2.deckStrategy && (
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: "0.375rem", fontStyle: "italic" }}>
                {p2.deckStrategy}
              </div>
            )}
          </div>
        </div>

        {/* Match notes */}
        {match.notes && (
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
        )}

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
      </div>
    </DetailsPageShell>
  );
};

export default MatchDetailsPage;
