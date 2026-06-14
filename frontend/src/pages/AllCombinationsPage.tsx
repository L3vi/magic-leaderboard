import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { getCachedCommanderColors } from "../utils/commanderColorCache";
import { colorKey, comboLabel, COLOR_HEX, COLOR_MAP } from "../utils/colorCombos";
import DetailsPageShell from "../components/DetailsPageShell/DetailsPageShell";
import "./AllCombinationsPage.css";

interface ComboTally {
  key: string; // WUBRG-ordered identity key, e.g. "WBR"
  label: string; // "Mardu", "Five-Color", "Red", …
  plays: number;
  decks: number; // distinct decks of this identity
  wins: number;
  winRate: number; // 0–100
}

/**
 * Every color combination played this season, ranked by plays. Reached from the
 * "View all combinations" link under Most Played Combinations on the Stats tab;
 * each row drills into that combination's detail page (/stats/combos/:key).
 */
const AllCombinationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { games } = useSession();

  const combos = useMemo<ComboTally[]>(() => {
    if (!games || games.length === 0) return [];
    const map = new Map<string, { key: string; plays: number; wins: number; decks: Set<string> }>();

    games.forEach((game) => {
      game.players?.forEach((player) => {
        const commanders = Array.isArray(player.commander) ? player.commander : [player.commander];
        const real = commanders.filter((c) => c && c.trim() !== "" && c !== "Unknown");
        if (real.length === 0) return;

        const colors = new Set<string>();
        real.forEach((c) => (getCachedCommanderColors(c) || []).forEach((x) => colors.add(x)));
        if (colors.size === 0) return; // colors not loaded / unknown

        const key = colorKey([...colors]);
        let e = map.get(key);
        if (!e) map.set(key, (e = { key, plays: 0, wins: 0, decks: new Set() }));
        e.plays++;
        if (player.placement === 1) e.wins++;
        const deckName = real.length >= 2 ? [...real].sort().join(" // ") : real[0];
        e.decks.add(deckName);
      });
    });

    return [...map.values()]
      .map((e) => ({
        key: e.key,
        label: comboLabel(e.key),
        plays: e.plays,
        decks: e.decks.size,
        wins: e.wins,
        winRate: e.plays > 0 ? Math.round((e.wins / e.plays) * 100) : 0,
      }))
      .sort((a, b) => b.plays - a.plays || b.wins - a.wins || a.key.localeCompare(b.key));
  }, [games]);

  const handleClose = () => navigate(-1);

  const renderPips = (key: string) =>
    key.split("").map((c, i) => (
      <span key={i} className="combo-pip" style={{ background: COLOR_HEX[c] }} title={COLOR_MAP[c]} />
    ));

  const totalPlays = combos.reduce((n, c) => n + c.plays, 0);

  return (
    <DetailsPageShell title="Color Combinations" onClose={handleClose}>
      <div className="all-combinations">
        <section className="stats-summary-section">
          <div className="stats-summary-grid">
            <div className="stat-card">
              <div className="stat-label">Combinations</div>
              <div className="stat-value">{combos.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Plays</div>
              <div className="stat-value">{totalPlays}</div>
            </div>
          </div>
        </section>

        <section className="combinations-section">
          <h2 className="section-heading">All Combinations ({combos.length})</h2>
          <div className="combinations-list">
            {combos.length === 0 ? (
              <div className="empty-state">No combinations recorded this season yet.</div>
            ) : (
              combos.map((combo) => (
                <div
                  key={combo.key}
                  className="combo-list-row clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/stats/combos/${combo.key}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/stats/combos/${combo.key}`);
                    }
                  }}
                >
                  <span className="combo-pips">{renderPips(combo.key)}</span>
                  <div className="combo-list-info">
                    <div className="combo-list-name">{combo.label}</div>
                    <div className="combo-list-meta">
                      <span className="combo-list-plays">
                        {combo.plays} {combo.plays === 1 ? "play" : "plays"}
                      </span>{" "}
                      · {combo.decks} {combo.decks === 1 ? "deck" : "decks"} · {combo.winRate}% win
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </DetailsPageShell>
  );
};

export default AllCombinationsPage;
