import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DetailsPageShell from "../components/DetailsPageShell/DetailsPageShell";
import { useCubeEvent } from "../context/CubeEventContext";
import { getMatchWinner } from "../utils/standings";
import ColorCircles from "../components/ColorCircles/ColorCircles";
import type { Player, ManaColor } from "../types";
import { MANA_COLOR_NAMES } from "../types";

const MatchDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { matchId } = useParams<{ matchId: string }>();
  const { event, players } = useCubeEvent();

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
      <DetailsPageShell title="Match" onClose={() => navigate("/stats")}>
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--danger)" }}>Match not found.</div>
      </DetailsPageShell>
    );
  }

  const [p1, p2] = match.players;
  const winnerId = getMatchWinner(match);
  const p1Name = playerLookup[p1.playerId]?.name || p1.playerId;
  const p2Name = playerLookup[p2.playerId]?.name || p2.playerId;

  return (
    <DetailsPageShell title="Match Details" onClose={() => navigate("/stats")}>
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
              {p1.deckColors.map(c => (
                <span key={c} style={{
                  fontSize: "var(--font-size-xs)",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "var(--radius-full)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)"
                }}>
                  {MANA_COLOR_NAMES[c]}
                </span>
              ))}
            </div>
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
              {p2.deckColors.map(c => (
                <span key={c} style={{
                  fontSize: "var(--font-size-xs)",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "var(--radius-full)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)"
                }}>
                  {MANA_COLOR_NAMES[c]}
                </span>
              ))}
            </div>
          </div>
        </div>

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
      </div>
    </DetailsPageShell>
  );
};

export default MatchDetailsPage;
