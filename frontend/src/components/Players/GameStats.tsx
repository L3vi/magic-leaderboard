import React, { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../context/SessionContext";
import { useCommanderArt } from "../../hooks/useCommanderArt";
import { getCachedCommanderColors } from "../../utils/commanderColorCache";
import { preFetchCommanderData } from "../../services/commanderPreFetchService";
import { formatPlayTime } from "../../utils/formatTime";
import { scorePlacement } from "../../services/dataService";
import "./GameStats.css";

interface CommanderStats {
  name: string; // display name — "A // B" for partner decks
  artName: string; // single commander name to fetch art for (first of a pair)
  playCount: number;
  wins: number;
  winRate: number;
  // Placement-based performance (1st=4 … 4th+=1), matching player scoring.
  scoreSum: number;
  average: number; // raw avg placement points per game (higher = better)
  weightedAverage: number; // Bayesian-smoothed average, used for ranking
}

// A headline "best commander" callout (Most Wins / Best Win Rate).
interface CommanderAccolade {
  name: string;
  wins: number;
  playCount: number;
  winRate: number;
}

interface ColorStats {
  color: string;
  playCount: number;
  wins: number;
  winRate: number;
  averagePlacement?: number;
  totalPlacement?: number;
  topCommanders?: Array<{ name: string; playCount: number; wins: number }>;
}

const COLOR_MAP: Record<string, string> = {
  "W": "White",
  "U": "Blue",
  "B": "Black",
  "R": "Red",
  "G": "Green",
};

// Pip colors for the small color-identity dots next to a combination name.
const COLOR_HEX: Record<string, string> = {
  W: "#f7f3d8", U: "#0ea5e9", B: "#6b7280", R: "#ef4444", G: "#22c55e",
};

// A deck's color identity, normalized to canonical WUBRG order so it maps to a
// single combination key regardless of the order colors were encountered.
const WUBRG = "WUBRG";
const colorKey = (colors: string[]): string =>
  [...new Set(colors)].sort((a, b) => WUBRG.indexOf(a) - WUBRG.indexOf(b)).join("");

// Canonical Commander color-combination names. Built from WUBRG-ordered keys so
// e.g. Boros (R,W) and any "W,R" both resolve to the same "WR" → "Boros".
const COMBO_NAMES: Record<string, string> = (() => {
  const defs: Record<string, string> = {
    // Guilds (2-color)
    WU: "Azorius", UB: "Dimir", BR: "Rakdos", RG: "Gruul", GW: "Selesnya",
    WB: "Orzhov", UR: "Izzet", BG: "Golgari", RW: "Boros", GU: "Simic",
    // Shards (allied 3-color)
    WUB: "Esper", UBR: "Grixis", BRG: "Jund", RGW: "Naya", GWU: "Bant",
    // Wedges (enemy 3-color)
    WBG: "Abzan", URW: "Jeskai", BGU: "Sultai", RWB: "Mardu", GUR: "Temur",
    // Nephilim (4-color, named by the missing color)
    WUBR: "Yore-Tiller", UBRG: "Glint-Eye", WBRG: "Dune-Brood", WURG: "Ink-Treader", WUBG: "Witch-Maw",
    // 5-color
    WUBRG: "Five-Color",
  };
  const out: Record<string, string> = {};
  for (const [colors, name] of Object.entries(defs)) out[colorKey(colors.split(""))] = name;
  return out;
})();

const TIER_LABELS: Record<number, string> = {
  1: "Mono", 2: "2-color", 3: "3-color", 4: "4-color", 5: "5-color",
};

// Commander colors are read straight from the cache; the cache is populated up
// front by preFetchCommanderData (see the effect below), so this stays a pure
// read and never fires its own per-commander request.
const getCommanderColors = (commanderName: string): string[] => {
  return getCachedCommanderColors(commanderName);
};
// Sub-component to display commander with image
interface CommanderThumbnailProps {
  name: string;
  artName: string;
  rank: number;
  playCount: number;
  wins: number;
  average: number;
}

const CommanderThumbnail: React.FC<CommanderThumbnailProps> = ({ name, artName, rank, playCount, wins, average }) => {
  // Art is fetched for a single card; for a partner deck ("A // B") use the
  // first commander, since the joined name isn't a real card to look up.
  const imageUrl = useCommanderArt(artName);

  return (
    <div className="commander-item">
      {imageUrl && (
        <div className="commander-item-image">
          <img src={imageUrl} alt={name} title={name} />
        </div>
      )}
      <div className="commander-item-info">
        <div className="commander-item-name">{name}</div>
        <div className="commander-item-stats"><span className="commander-item-metric">{average.toFixed(1)} average points</span> • {playCount} {playCount === 1 ? "play" : "plays"} • {wins} {wins === 1 ? "win" : "wins"}</div>
      </div>
    </div>
  );
};
const GameStats: React.FC = () => {
  const navigate = useNavigate();
  const { games } = useSession();
  // Bump on each prefetch completion so the stats memo recomputes with the
  // now-populated color cache. A counter (not a boolean) is required so a
  // season switch — which fetches a fresh batch of colors — still triggers a
  // recompute; a one-way boolean would no-op on every season after the first.
  const [colorVersion, setColorVersion] = useState(0);

  // Pre-fetch art + colors for this season's commanders in one batched pass
  // (Scryfall /cards/collection). Cheap no-op when everything is already cached.
  useEffect(() => {
    if (games.length === 0) return;
    // Bump on each progress tick (per collection batch + after the fallback), not
    // just on final resolution — so colors paint as soon as the bulk lands rather
    // than waiting on the slow serialized fallback, which can stall on mobile.
    preFetchCommanderData(games, () => setColorVersion((v) => v + 1));
  }, [games]);

  const stats = useMemo(() => {
    if (games.length === 0) {
      return {
        totalGames: 0,
        totalPlayers: 0,
        averagePlayersPerGame: "0",
        totalGameMinutes: 0,
        typicalGameMinutes: 0,
        uniqueCommanders: 0,
        mostPlayedCommander: "N/A",
        commanderPlayCount: 0,
        mostWinsCommander: null as CommanderAccolade | null,
        bestWinRateCommander: null as CommanderAccolade | null,
        commanderStats: [] as CommanderStats[],
        colorStats: [] as ColorStats[],
        mostCommonColor: "N/A",
        commonColorCount: 0,
        multicolorShare: 0,
        avgColorsPerDeck: 0,
        colorCombos: {
          tiers: [] as Array<{ n: number; label: string; plays: number; share: number; winRate: number }>,
          top: [] as Array<{ label: string; key: string; colorCount: number; plays: number; winRate: number }>,
        },
        partnerPairs: [] as Array<{ pair: string; count: number }>,
      };
    }

    // Total games
    const totalGames = games.length;

    // Unique players
    const uniquePlayers = new Set<string>();
    games.forEach((game) => {
      game.players.forEach((p) => uniquePlayers.add(p.playerId));
    });
    const totalPlayers = uniquePlayers.size;

    // Average players per game
    const totalPlayerCount = games.reduce((sum, game) => sum + game.players.length, 0);
    const averagePlayersPerGame = (totalPlayerCount / totalGames).toFixed(1);

    // Estimated play time. Each game's timestamp is when it was logged, so the
    // gap to the next game ≈ how long that game took — but only for plausible
    // single-game gaps. Drop gaps over 150 min (sleep, going home, breaks
    // between sessions) and under 15 min (rapid back-logging or a quick
    // blowout — not a real game's length), take the median of what's left as
    // the typical game length, and scale by the game count. Scaling a robust
    // typical length beats summing raw gaps, which irregular logging distorts.
    const sortedTimes = games
      .map((g) => new Date(g.dateCreated).getTime())
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b);
    const gameGaps: number[] = [];
    for (let i = 1; i < sortedTimes.length; i++) {
      const gapMin = (sortedTimes[i] - sortedTimes[i - 1]) / 60000;
      if (gapMin >= 15 && gapMin <= 150) gameGaps.push(gapMin);
    }
    let typicalGameMinutes = 50; // fallback for sparse / synthetic timestamps
    if (gameGaps.length >= 3) {
      const s = [...gameGaps].sort((a, b) => a - b);
      typicalGameMinutes = s[Math.floor(s.length / 2)];
    }
    typicalGameMinutes = Math.min(120, Math.max(30, Math.round(typicalGameMinutes)));
    const totalGameMinutes = typicalGameMinutes * totalGames;

    // Deck color counts (for the multicolor share / average colors stats).
    let multicolorPlays = 0;
    let colorKnownPlays = 0;
    let totalDeckColors = 0;

    // Color-combination aggregation: by tier (number of colors) and by the named
    // combination (guild / shard / wedge / nephilim / five-color).
    const tierCounts: Record<number, { plays: number; wins: number }> = {};
    const comboCounts: Record<string, { label: string; key: string; colorCount: number; plays: number; wins: number }> = {};

    // Commander statistics
    const commanderStats: Record<string, CommanderStats> = {};
    const colorStats: Record<string, ColorStats> = {
      "W": { color: "W", playCount: 0, wins: 0, winRate: 0, totalPlacement: 0, topCommanders: [] },
      "U": { color: "U", playCount: 0, wins: 0, winRate: 0, totalPlacement: 0, topCommanders: [] },
      "B": { color: "B", playCount: 0, wins: 0, winRate: 0, totalPlacement: 0, topCommanders: [] },
      "R": { color: "R", playCount: 0, wins: 0, winRate: 0, totalPlacement: 0, topCommanders: [] },
      "G": { color: "G", playCount: 0, wins: 0, winRate: 0, totalPlacement: 0, topCommanders: [] },
    };
    const colorCommanderStats: Record<string, Record<string, { playCount: number; wins: number }>> = {
      "W": {}, "U": {}, "B": {}, "R": {}, "G": {}
    };
    const partnerPairCounts: Record<string, number> = {};
    const uniqueCommanderNames = new Set<string>();

    games.forEach((game) => {
      game.players.forEach((p) => {
        const commanders = Array.isArray(p.commander) ? p.commander : [p.commander];
        const isWinner = p.placement === 1;

        // Real commanders for this play (drop "Unknown"/empty placeholders).
        const deckCommanders = commanders.filter(
          (c) => c && c.trim() !== "" && c !== "Unknown"
        );
        deckCommanders.forEach((c) => uniqueCommanderNames.add(c));

        // Aggregate by DECK, not by individual commander: a partner pair is ONE
        // deck, so it's counted once (not double per partner) and ranked/shown
        // as "A // B" with a single set of stats rather than two split entries.
        if (deckCommanders.length > 0) {
          const sorted = [...deckCommanders].sort();
          const deckKey = sorted.join(" // ");
          if (!commanderStats[deckKey]) {
            commanderStats[deckKey] = {
              name: deckKey,
              artName: sorted[0],
              playCount: 0,
              wins: 0,
              winRate: 0,
              scoreSum: 0,
              average: 0,
              weightedAverage: 0,
            };
          }
          commanderStats[deckKey].playCount += 1;
          commanderStats[deckKey].scoreSum += scorePlacement(p.placement);
          if (isWinner) {
            commanderStats[deckKey].wins += 1;
          }
        }

        // Track partner pairs
        if (commanders.length === 2) {
          const pair = [commanders[0], commanders[1]].sort().join(" // ");
          partnerPairCounts[pair] = (partnerPairCounts[pair] || 0) + 1;
        }

        // Color statistics - get colors from all commanders (for partners) and count each color
        const allCommanderColors = new Set<string>();
        commanders.forEach((commander) => {
          const colors = getCommanderColors(commander);
          colors.forEach((color) => allCommanderColors.add(color));
        });

        // Multicolor share / avg colors — only count plays whose colors we
        // actually know (skips "Unknown" and not-yet-loaded commanders).
        const deckColorCount = allCommanderColors.size;
        if (deckColorCount >= 1) {
          colorKnownPlays++;
          totalDeckColors += deckColorCount;
          if (deckColorCount >= 2) multicolorPlays++;

          // Bucket this deck-play by tier and by named combination.
          const k = colorKey([...allCommanderColors]);
          const label = deckColorCount === 1 ? COLOR_MAP[k] : COMBO_NAMES[k] || k;
          const tier = tierCounts[deckColorCount] || (tierCounts[deckColorCount] = { plays: 0, wins: 0 });
          tier.plays += 1;
          if (isWinner) tier.wins += 1;
          const combo = comboCounts[k] || (comboCounts[k] = { label, key: k, colorCount: deckColorCount, plays: 0, wins: 0 });
          combo.plays += 1;
          if (isWinner) combo.wins += 1;
        }

        allCommanderColors.forEach((color) => {
          colorStats[color].playCount += 1;
          if (isWinner) {
            colorStats[color].wins += 1;
          }
          colorStats[color].totalPlacement! += p.placement;
          
          // Track commanders per color (only the primary/first commander for now)
          if (!colorCommanderStats[color][commanders[0]]) {
            colorCommanderStats[color][commanders[0]] = { playCount: 0, wins: 0 };
          }
          colorCommanderStats[color][commanders[0]].playCount += 1;
          if (isWinner) {
            colorCommanderStats[color][commanders[0]].wins += 1;
          }
        });
      });
    });

    // Win rate (1st-place finishes) + average placement score per commander.
    Object.values(commanderStats).forEach((stat) => {
      stat.winRate = (stat.wins / stat.playCount) * 100;
      stat.average = stat.scoreSum / stat.playCount;
    });

    Object.values(colorStats).forEach((stat) => {
      stat.winRate = stat.playCount > 0 ? (stat.wins / stat.playCount) * 100 : 0;
      stat.averagePlacement = stat.playCount > 0 ? stat.totalPlacement! / stat.playCount : 0;
      
      // Get top 3 commanders for this color
      const cmdrList = Object.entries(colorCommanderStats[stat.color] || {})
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 3);
      stat.topCommanders = cmdrList;
    });

    // Rank commanders by performance, not raw win rate. "Win rate" only credits
    // 1st place, so a commander that consistently places 2nd/3rd in 4-player pods
    // looks terrible. Instead use the same placement-points scoring as the player
    // leaderboard (1st=4 … 4th+=1), Bayesian-smoothed toward the league average so
    // a commander with one lucky game doesn't top a commander with a solid record.
    const minPlayThreshold = 3;
    const commanderArray = Object.values(commanderStats).filter((c) => c.playCount >= minPlayThreshold);

    const totalCommanderScore = commanderArray.reduce((sum, c) => sum + c.scoreSum, 0);
    const totalCommanderPlays = commanderArray.reduce((sum, c) => sum + c.playCount, 0);
    const leagueAverageScore = totalCommanderPlays > 0 ? totalCommanderScore / totalCommanderPlays : 2.5;

    commanderArray.forEach((c) => {
      c.weightedAverage =
        (c.playCount * c.average + minPlayThreshold * leagueAverageScore) /
        (c.playCount + minPlayThreshold);
    });

    const topCommanders = commanderArray
      .sort((a, b) => b.weightedAverage - a.weightedAverage)
      .slice(0, 5);

    // Two headline accolades for the casual "best commander" question:
    //  • Most Wins — the workhorse, by raw 1st-place finishes (volume-driven).
    //  • Best Win Rate — pound-for-pound strongest, among decks with enough
    //    games that the rate means something.
    const allCommanders = Object.values(commanderStats);

    const mostWinsRanked = [...allCommanders].sort(
      // most wins; ties broken by higher win rate, then fewer plays (more efficient)
      (a, b) => b.wins - a.wins || b.winRate - a.winRate || a.playCount - b.playCount
    );
    const mostWinsCommander: CommanderAccolade | null =
      mostWinsRanked[0] && mostWinsRanked[0].wins > 0
        ? {
            name: mostWinsRanked[0].name,
            wins: mostWinsRanked[0].wins,
            playCount: mostWinsRanked[0].playCount,
            winRate: mostWinsRanked[0].winRate,
          }
        : null;

    const MIN_WINRATE_GAMES = 3;
    const bestRateRanked = allCommanders
      .filter((c) => c.playCount >= MIN_WINRATE_GAMES)
      // highest win rate; ties broken by more games, then more wins
      .sort((a, b) => b.winRate - a.winRate || b.playCount - a.playCount || b.wins - a.wins);
    const bestWinRateCommander: CommanderAccolade | null = bestRateRanked[0]
      ? {
          name: bestRateRanked[0].name,
          wins: bestRateRanked[0].wins,
          playCount: bestRateRanked[0].playCount,
          winRate: bestRateRanked[0].winRate,
        }
      : null;

    // Most played commander (for reference, though not shown)
    const sortedByPlay = Object.values(commanderStats).sort((a, b) => b.playCount - a.playCount);
    const mostPlayedCommander = sortedByPlay[0]?.name || "N/A";
    const commanderPlayCount = sortedByPlay[0]?.playCount || 0;

    // Color cards are ranked by win rate (performance); colors with 0 plays last.
    const sortedByColor = Object.values(colorStats).sort((a, b) => {
      if (a.playCount === 0 && b.playCount === 0) return 0;
      if (a.playCount === 0) return 1;
      if (b.playCount === 0) return -1;
      return b.winRate - a.winRate;
    });

    // Most COMMON color = most plays (a separate question from best win rate).
    const byColorPlays = Object.values(colorStats)
      .filter((c) => c.playCount > 0)
      .sort((a, b) => b.playCount - a.playCount);
    const mostCommonColorCode = byColorPlays[0]?.color || "U";
    const commonColorCount = byColorPlays[0]?.playCount || 0;

    // How colorful are the decks?
    const multicolorShare = colorKnownPlays > 0 ? Math.round((multicolorPlays / colorKnownPlays) * 100) : 0;
    const avgColorsPerDeck = colorKnownPlays > 0 ? totalDeckColors / colorKnownPlays : 0;

    // Color combinations: tier breakdown (by # of colors), the most-played named
    // combinations.
    const comboTiers = [1, 2, 3, 4, 5]
      .filter((n) => tierCounts[n]?.plays)
      .map((n) => ({
        n,
        label: TIER_LABELS[n],
        plays: tierCounts[n].plays,
        share: colorKnownPlays > 0 ? Math.round((tierCounts[n].plays / colorKnownPlays) * 100) : 0,
        winRate: tierCounts[n].plays > 0 ? Math.round((tierCounts[n].wins / tierCounts[n].plays) * 100) : 0,
      }));
    const topCombos = Object.values(comboCounts)
      .sort((a, b) => b.plays - a.plays || b.wins - a.wins)
      .slice(0, 6)
      .map((c) => ({
        label: c.label,
        key: c.key,
        colorCount: c.colorCount,
        plays: c.plays,
        winRate: c.plays > 0 ? Math.round((c.wins / c.plays) * 100) : 0,
      }));
    const colorCombos = { tiers: comboTiers, top: topCombos };

    // Partner pairs
    const partnerPairs = Object.entries(partnerPairCounts)
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalGames,
      totalPlayers,
      averagePlayersPerGame,
      totalGameMinutes,
      typicalGameMinutes,
      uniqueCommanders: uniqueCommanderNames.size,
      mostPlayedCommander,
      commanderPlayCount,
      mostWinsCommander,
      bestWinRateCommander,
      commanderStats: topCommanders,
      colorStats: sortedByColor,
      mostCommonColor: COLOR_MAP[mostCommonColorCode] || mostCommonColorCode,
      mostCommonColorCode,
      commonColorCount,
      multicolorShare,
      avgColorsPerDeck,
      colorCombos,
      partnerPairs,
    };
  }, [games, colorVersion]);

  // Inviting empty state instead of a wall of zeros + "N/A" badges when the
  // season has no games yet. Points at the existing New Game button rather than
  // duplicating it with its own CTA.
  if (games.length === 0) {
    return (
      <div className="game-stats">
        <div className="stats-empty">
          <div className="stats-empty-icon">🎲</div>
          <h2 className="stats-empty-title">No games yet</h2>
          <p className="stats-empty-text">
            Standings, commander performance, and color breakdowns all show up
            here once this season has games. Record a <strong>New Game</strong> to add
            the first one.
          </p>
        </div>
      </div>
    );
  }

  // Small color-identity dots for a combination (e.g. Mardu → red/white/black).
  const renderPips = (key: string) =>
    key.split("").map((c, i) => (
      <span key={i} className="combo-pip" style={{ background: COLOR_HEX[c] }} title={COLOR_MAP[c]} />
    ));

  return (
    <div className="game-stats">
      <h2>Overall Game Statistics</h2>

      {/* Core Game Stats */}
      <div className="stats-section">
        <h3>Season Overview</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Games</div>
            <div className="stat-value">{stats.totalGames}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Players</div>
            <div className="stat-value">{stats.totalPlayers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Unique Commanders</div>
            <div className="stat-value">{stats.uniqueCommanders}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Average Players per Game</div>
            <div className="stat-value">{stats.averagePlayersPerGame}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Estimated Play Time</div>
            <div className="stat-value">{formatPlayTime(stats.totalGameMinutes)}</div>
            <div className="stat-subtext">≈ {stats.typicalGameMinutes} min per game</div>
          </div>
        </div>
      </div>

      {/* Commander Stats */}
      <div className="stats-section">
        <h3>Commander Performance</h3>

        {(stats.commanderPlayCount > 0 || stats.mostWinsCommander || stats.bestWinRateCommander) && (
          <div className="stats-grid">
            {stats.commanderPlayCount > 0 && (
              <div className="stat-card best-commander">
                <div className="stat-label">Most Played</div>
                <div className="stat-value commander-name">{stats.mostPlayedCommander}</div>
                <div className="stat-subtext">
                  {stats.commanderPlayCount} {stats.commanderPlayCount === 1 ? "game" : "games"}
                </div>
              </div>
            )}
            {stats.mostWinsCommander && (
              <div className="stat-card best-commander">
                <div className="stat-label">Most Wins</div>
                <div className="stat-value commander-name">{stats.mostWinsCommander.name}</div>
                <div className="stat-subtext">
                  {stats.mostWinsCommander.wins} {stats.mostWinsCommander.wins === 1 ? "win" : "wins"} in {stats.mostWinsCommander.playCount} games · {stats.mostWinsCommander.winRate.toFixed(0)}%
                </div>
              </div>
            )}
            {stats.bestWinRateCommander && (
              <div className="stat-card best-commander">
                <div className="stat-label">Best Win Rate</div>
                <div className="stat-value commander-name">{stats.bestWinRateCommander.name}</div>
                <div className="stat-subtext">
                  {stats.bestWinRateCommander.winRate.toFixed(0)}% · {stats.bestWinRateCommander.wins} of {stats.bestWinRateCommander.playCount} games
                </div>
              </div>
            )}
          </div>
        )}

        <div className="stats-subhead">Top Commanders</div>
        <div className="section-note">
          Ranked by average points per game — 1st = 4, 2nd = 3, 3rd = 2, 4th+ = 1
        </div>
        {stats.commanderStats.length > 0 ? (
          <div className="top-commanders-grid">
            {stats.commanderStats.map((cmd, idx) => (
              <CommanderThumbnail
                key={idx}
                name={cmd.name}
                artName={cmd.artName}
                rank={idx + 1}
                playCount={cmd.playCount}
                wins={cmd.wins}
                average={cmd.average}
              />
            ))}
          </div>
        ) : (
          <div className="commander-item empty">No commander data</div>
        )}
      </div>

      {/* Color Stats */}
      <div className="stats-section">
        <h3>Color Performance</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Most Common Color</div>
            <div className={`stat-value color-badge color-${stats.mostCommonColorCode?.toLowerCase() || 'u'}`}>{stats.mostCommonColor}</div>
            <div className="stat-subtext">{stats.commonColorCount} {stats.commonColorCount === 1 ? "play" : "plays"}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Multicolor Decks</div>
            <div className="stat-value">{stats.multicolorShare}%</div>
            <div className="stat-subtext">{stats.avgColorsPerDeck.toFixed(1)} colors per deck on average</div>
          </div>
        </div>

        <div className="stats-subhead">Win Rate by Color</div>
        <div className="color-stats-simple">
          {stats.colorStats.length > 0 ? (
            stats.colorStats.map((color, idx) => {
              return (
                <div
                  key={idx}
                  className={`color-stat-card color-${color.color.toLowerCase()}`}
                  onClick={() => navigate(`/stats/colors/${color.color}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      navigate(`/stats/colors/${color.color}`);
                    }
                  }}
                >
                  <div className="color-stat-header">
                    <div className="color-stat-name">{COLOR_MAP[color.color] || color.color}</div>
                    <div className="color-stat-plays">{color.playCount} {color.playCount === 1 ? "play" : "plays"}</div>
                  </div>
                  <div className="color-stat-record">{color.wins} {color.wins === 1 ? "win" : "wins"} • {color.playCount - color.wins} {(color.playCount - color.wins) === 1 ? "loss" : "losses"}</div>
                  <div className="color-stat-rate">{color.winRate.toFixed(0)}%</div>
                </div>
              );
            })
          ) : (
            <div>No color data</div>
          )}
        </div>
      </div>

      {/* Color Combinations */}
      {stats.colorCombos.tiers.length > 0 && (
        <div className="stats-section">
          <h3>Color Combinations</h3>

          <div className="stats-subhead">By Number of Colors</div>
          <div className="combo-tiers">
            {stats.colorCombos.tiers.map((t) => (
              <div className="combo-tier-card" key={t.n}>
                <div className="combo-tier-pct">{t.share}%</div>
                <div className="combo-tier-label">{t.label}</div>
                <div className="combo-tier-sub">{t.plays} {t.plays === 1 ? "deck" : "decks"} · {t.winRate}% win</div>
              </div>
            ))}
          </div>

          <div className="stats-subhead">Most Played Combinations</div>
          <div className="combo-list">
            {stats.colorCombos.top.map((c, idx) => (
              <div className="combo-row" key={idx}>
                <span className="combo-pips">{renderPips(c.key)}</span>
                <span className="combo-name">{c.label}</span>
                <span className="combo-meta">
                  {c.plays} {c.plays === 1 ? "play" : "plays"} · {c.winRate}% win
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameStats;
