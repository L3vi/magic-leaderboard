import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { getCachedCommanderColors } from "../utils/commanderColorCache";
import { colorKey, comboLabel, COMBO_NAMES, TIER_LABELS } from "../utils/colorCombos";
import { encodeCommanderKey } from "../utils/commanderKey";
import { useComboBackdrop } from "../hooks/useColorBackdrop";
import DetailsPageShell from "../components/DetailsPageShell/DetailsPageShell";
import ComboStatsDetails from "../components/ColorStats/ComboStatsDetails";
import type { ComboStatsData, ComboCommanderStats } from "../types";

/**
 * Drill-down for a color combination. Two modes, distinguished by route param:
 *   /stats/combos/:comboKey  — a specific named identity (e.g. "RWB" → Mardu)
 *   /stats/tiers/:tier       — every deck with N colors (e.g. 3 → all 3-color)
 *
 * Decks are aggregated by deck (partner pairs shown once as "A // B"), so a
 * commander played 9 times appears once at the top with its combined record.
 */
export default function ComboStatsPage() {
  const { comboKey: rawComboKey, tier: rawTier } = useParams<{
    comboKey?: string;
    tier?: string;
  }>();
  const navigate = useNavigate();
  const { games } = useSession();

  // Normalize the combo key to canonical WUBRG order so a hand-typed or
  // out-of-order URL still resolves to the right identity.
  const comboKey = rawComboKey ? colorKey(rawComboKey.toUpperCase().split("")) : undefined;
  const tier = rawTier ? parseInt(rawTier, 10) : undefined;
  const isTier = tier !== undefined;

  // Faded Triome art behind 3-color combo pages (e.g. Xander's Lounge for
  // Grixis), tinted by the combo's blended mana colors. Tier pages get nothing.
  const { image: backdropImage, tint: backdropTint } = useComboBackdrop(
    isTier ? undefined : comboKey
  );

  const stats = useMemo<ComboStatsData | null>(() => {
    if (!games || games.length === 0) return null;
    if (isTier && (Number.isNaN(tier) || tier! < 1 || tier! > 5)) return null;
    if (!isTier && !comboKey) return null;

    const commanderMap = new Map<string, ComboCommanderStats>();
    // Distinct players per commander → pilot count = distinct decks of it.
    const pilotsByCommander = new Map<string, Set<string>>();
    let totalPlays = 0;
    let totalWins = 0;

    games.forEach((game) => {
      game.players?.forEach((player) => {
        const commanders = Array.isArray(player.commander)
          ? player.commander
          : [player.commander];

        // Drop placeholder/unknown commanders; a deck's identity is the union
        // of its (real) commanders' colors.
        const realCommanders = commanders.filter(
          (c) => c && c.trim() !== "" && c !== "Unknown"
        );
        if (realCommanders.length === 0) return;

        const deckColors = new Set<string>();
        realCommanders.forEach((c) =>
          (getCachedCommanderColors(c) || []).forEach((col) => deckColors.add(col))
        );
        if (deckColors.size === 0) return; // colors not loaded / unknown

        const deckKey = colorKey([...deckColors]);
        const matches = isTier ? deckColors.size === tier : deckKey === comboKey;
        if (!matches) return;

        totalPlays++;
        const isWinner = player.placement === 1;
        if (isWinner) totalWins++;

        const deckName =
          realCommanders.length >= 2
            ? [...realCommanders].sort().join(" // ")
            : realCommanders[0];
        if (!commanderMap.has(deckName)) {
          commanderMap.set(deckName, {
            commanderName: deckName,
            plays: 0,
            pilots: 0,
            wins: 0,
            winRate: 0,
          });
        }
        const s = commanderMap.get(deckName)!;
        s.plays++;
        if (isWinner) s.wins++;
        s.winRate = s.wins / s.plays;

        let pilotSet = pilotsByCommander.get(deckName);
        if (!pilotSet) pilotsByCommander.set(deckName, (pilotSet = new Set()));
        pilotSet.add(player.playerId);
      });
    });

    // Fold each commander's distinct-pilot count in; a pilot = one deck, so the
    // sum across commanders is the number of distinct decks in this combination.
    let totalDecks = 0;
    commanderMap.forEach((cmd, name) => {
      cmd.pilots = pilotsByCommander.get(name)?.size ?? 0;
      totalDecks += cmd.pilots;
    });

    const commanders = Array.from(commanderMap.values()).sort((a, b) => {
      if (b.plays !== a.plays) return b.plays - a.plays;
      return b.winRate - a.winRate;
    });

    return {
      comboKey: isTier ? "" : comboKey!,
      label: isTier ? TIER_LABELS[tier!] : comboLabel(comboKey!),
      totalPlays,
      totalDecks,
      totalWins,
      winRate: totalPlays > 0 ? totalWins / totalPlays : 0,
      commanders,
    };
  }, [games, comboKey, tier, isTier]);

  const handleClose = () => navigate(-1);

  // Invalid route params (bad tier number, or a multi-color key that isn't a
  // recognized combination).
  const invalid = isTier
    ? Number.isNaN(tier) || tier! < 1 || tier! > 5
    : !comboKey || (comboKey.length > 1 && !COMBO_NAMES[comboKey]);

  if (invalid) {
    return (
      <DetailsPageShell
        title="Combination Stats"
        onClose={handleClose}
        error="Combination not found"
      />
    );
  }

  const heading = isTier ? TIER_LABELS[tier!] : comboLabel(comboKey!);

  if (!stats || stats.totalPlays === 0) {
    return (
      <DetailsPageShell
        title={`${heading} Stats`}
        onClose={handleClose}
        error={`No ${heading} decks recorded this season yet.`}
      />
    );
  }

  return (
    <DetailsPageShell
      title="Combination Statistics"
      onClose={handleClose}
      backdropImage={backdropImage || undefined}
      backdropTint={backdropTint || undefined}
    >
      <ComboStatsDetails
        stats={stats}
        onCommanderClick={(name) =>
          navigate(`/stats/commanders/${encodeCommanderKey(name)}`)
        }
      />
    </DetailsPageShell>
  );
}
