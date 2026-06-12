import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { commanderDeckName, splitDeckName, decodeCommanderKey } from "../utils/commanderKey";
import { useCommanderArt } from "../hooks/useCommanderArt";
import DetailsPageShell from "../components/DetailsPageShell/DetailsPageShell";
import CommanderStatsDetails from "../components/Commanders/CommanderStatsDetails";
import type {
  CommanderStatsData,
  CommanderPilotStats,
  CommanderGameAppearance,
} from "../types";

/**
 * Drill-down for a single commander/deck (route: /stats/commanders/:commanderKey).
 *
 * Aggregates every game this season in which the deck appeared — its overall
 * record, each pilot who played it, and a game-by-game list. Partner decks are
 * keyed by their canonical sorted "A // B" name (see commanderDeckName), so a
 * deck reached from a game row, a player page, or a color/combo drill-down all
 * resolve here identically.
 */
export default function CommanderStatsPage() {
  const { commanderKey } = useParams<{ commanderKey: string }>();
  const navigate = useNavigate();
  const { games, players } = useSession();

  const deckName = commanderKey ? decodeCommanderKey(commanderKey) : "";

  // Faded card art behind the page. Use the first commander's art (partner
  // decks just lead with the "A" half) — pulled from the shared Scryfall cache.
  const backdropCommander = deckName ? splitDeckName(deckName)[0] : "";
  const backdropImage = useCommanderArt(backdropCommander);

  const stats = useMemo<CommanderStatsData | null>(() => {
    if (!deckName || !games || games.length === 0) return null;

    const getPlayerName = (id: string) =>
      players.find((p) => p.id === id)?.name || id;

    const pilotMap = new Map<string, CommanderPilotStats>();
    const appearances: CommanderGameAppearance[] = [];
    let totalPlays = 0;
    let totalWins = 0;

    games.forEach((game) => {
      game.players?.forEach((player) => {
        if (commanderDeckName(player.commander) !== deckName) return;

        const name = getPlayerName(player.playerId);
        const isWinner = player.placement === 1;
        totalPlays++;
        if (isWinner) totalWins++;

        if (!pilotMap.has(name)) {
          pilotMap.set(name, { playerName: name, plays: 0, wins: 0, winRate: 0 });
        }
        const pilot = pilotMap.get(name)!;
        pilot.plays++;
        if (isWinner) pilot.wins++;
        pilot.winRate = pilot.wins / pilot.plays;

        appearances.push({
          gameId: game.id,
          dateCreated: game.dateCreated,
          playerName: name,
          placement: player.placement,
          playerCount: game.players.length,
        });
      });
    });

    if (totalPlays === 0) return null;

    const pilots = Array.from(pilotMap.values()).sort((a, b) => {
      if (b.plays !== a.plays) return b.plays - a.plays;
      return b.winRate - a.winRate;
    });

    appearances.sort(
      (a, b) =>
        new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
    );

    return {
      deckName,
      commanders: splitDeckName(deckName),
      totalPlays,
      totalWins,
      winRate: totalWins / totalPlays,
      pilots,
      appearances,
    };
  }, [games, players, deckName]);

  const handleClose = () => navigate(-1);

  if (!deckName) {
    return (
      <DetailsPageShell
        title="Commander Statistics"
        onClose={handleClose}
        error="Commander not found"
      />
    );
  }

  if (!stats) {
    return (
      <DetailsPageShell
        title={deckName}
        onClose={handleClose}
        error={`No games with ${deckName} recorded this season yet.`}
      />
    );
  }

  return (
    <DetailsPageShell
      title="Commander Statistics"
      onClose={handleClose}
      backdropImage={backdropImage || undefined}
    >
      <CommanderStatsDetails
        stats={stats}
        onPilotClick={(name) => navigate(`/players/${encodeURIComponent(name)}`)}
        onGameClick={(gameId) => navigate(`/games/${gameId}`)}
      />
    </DetailsPageShell>
  );
}
