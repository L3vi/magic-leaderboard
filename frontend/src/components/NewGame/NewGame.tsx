
import React, { useState, useEffect, useRef } from 'react';
import {
  useFloating,
  useInteractions,
  useDismiss,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  FloatingPortal
} from '@floating-ui/react';
import FormActions from '../FormActions/FormActions';
import { usePlayers } from "../../hooks/usePlayers";
import { useGames, useAllGames } from "../../hooks/useApi";
import { useCommanderArt, useCommanderFullImage, useCommanderArtWithPreference } from "../../hooks/useCommanderArt";
import CardModal from "../CardModal/CardModal";
import "./NewGame.css";
import StaticDropdown from '../StaticDropdown/StaticDropdown';
import ShimmerImage from '../ShimmerImage/ShimmerImage';
import { scryfallFetch } from '../../services/scryfallClient';
import { getImageCache } from '../../services/cacheService';
import { isRealCommander } from '../../utils/commanderKey';

// CommanderAutocomplete - simple text input with card search
type CommanderAutocompleteProps = {
  value: string;
  onChange: (val: string) => void;
  playerId?: string;
  games: any[];
  defaultCommander?: string;
  onCardClick?: (card: { name: string; imageUrl: string; playerId?: string }) => void;
  onPartnerSelect?: (partnerCommander: string) => void;
};

const CommanderAutocomplete: React.FC<CommanderAutocompleteProps> = ({ value, onChange, playerId, games: gamesData, defaultCommander, onCardClick, onPartnerSelect }) => {
  const [results, setResults] = useState<{ name: string; id: string; image?: string; partnerCommander?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lastPlayedCommander, setLastPlayedCommander] = useState<string | null>(null);
  const [previousCommanders, setPreviousCommanders] = useState<{ name: string; partnerCommander?: string }[]>([]);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  // True once a search has come back empty, so we can show "No commanders
  // found" instead of an invisible, frozen-looking field.
  const [noResults, setNoResults] = useState(false);
  // The commander we actually fetch art for. It updates only when one is
  // chosen from the menu (or preset when editing), NEVER on every keystroke —
  // otherwise the art hooks below fire a Scryfall lookup per character, and
  // those pile up ahead of the search in the shared rate-limited queue.
  const [committedCommander, setCommittedCommander] = useState(value);
  const isTypingRef = useRef(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  // Tracks whether the text field currently has focus, so a search that
  // resolves after the user has dismissed the field doesn't re-open the list.
  const isFocusedRef = useRef(false);
  // Cancels the in-flight Scryfall request when a newer search starts, and
  // remembers the most recent query so a late-arriving response for an older
  // one is discarded instead of clobbering the list with stale results.
  const abortRef = useRef<AbortController | null>(null);
  const latestQueryRef = useRef("");

  // Wait until the user pauses, and don't fire off a network request for a
  // single character — "is:commander a" matches almost everything and returns a
  // huge payload for no useful signal.
  const SEARCH_DEBOUNCE_MS = 400;
  const MIN_QUERY_LENGTH = 2;
  const artUrl = useCommanderArt(committedCommander);
  const fullImageUrl = useCommanderFullImage(committedCommander);
  const preferenceArtUrl = useCommanderArtWithPreference(committedCommander, playerId && playerId !== "__add__" && playerId !== "" ? playerId : undefined);
  const defaultArtUrl = useCommanderArt(defaultCommander || '');
  const defaultFullImageUrl = useCommanderFullImage(defaultCommander || '');

  // The mobile keyboard shrinks the *visual* viewport but NOT the layout
  // viewport (window.innerHeight) on iOS, so floating-ui's default overflow
  // detection thinks there's room below the input and drops the menu straight
  // behind the keyboard. We feed flip/shift/size a rootBoundary derived from the
  // visual viewport so the menu flips above and caps its height to the space
  // that's actually visible above the keyboard. A ref keeps the latest rect for
  // the middleware; a state bump forces a recompute when the keyboard moves.
  const visualRectRef = useRef<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  const [viewportTick, setViewportTick] = useState(0);

  const { refs, floatingStyles, context, update } = useFloating({
    open: showDropdown,
    onOpenChange: setShowDropdown,
    placement: 'bottom-start',
    // Reposition the menu as the page scrolls or the viewport resizes (e.g. the
    // mobile keyboard sliding up). Without this the menu is placed once on open
    // and gets "left behind" when its input moves — rendering detached.
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({ padding: 8, rootBoundary: visualRectRef.current }),
      shift({ padding: 8, rootBoundary: visualRectRef.current }),
      size({
        padding: 8,
        rootBoundary: visualRectRef.current,
        apply({ availableHeight, rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
            // Never taller than the visible space in the chosen placement (so it
            // can't hide behind the keyboard), capped at a comfortable max and
            // floored so it doesn't collapse to a sliver mid-resize.
            maxHeight: `${Math.max(140, Math.min(Math.floor(availableHeight), 340))}px`,
          });
        },
      }),
    ],
  });

  // Track the visual viewport so the middleware above can exclude the keyboard.
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const sync = () => {
      if (vv) {
        visualRectRef.current = { x: vv.offsetLeft, y: vv.offsetTop, width: vv.width, height: vv.height };
      } else {
        visualRectRef.current = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
      }
      setViewportTick((t) => t + 1);
    };
    sync();
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    return () => {
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  // Recompute placement whenever the keyboard/viewport changes while open.
  useEffect(() => {
    if (showDropdown) update();
  }, [viewportTick, showDropdown, update]);

  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  // On unmount, drop any pending debounce and abort an in-flight request so a
  // late response can't set state on a gone component.
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      abortRef.current?.abort();
    };
  }, []);

  // Keep the committed commander in sync with externally-set values (edit-mode
  // preload, partner auto-fill) and with clears — but ignore the per-keystroke
  // updates that come from typing, which is what isTypingRef flags.
  useEffect(() => {
    if (!value) {
      setCommittedCommander("");
      return;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      return;
    }
    setCommittedCommander(value);
  }, [value]);

  // Drive the art preview off the committed commander. Show its art only when
  // the text still matches it (i.e. a real chosen card, not half-edited text);
  // otherwise fall back to the player's last-played default, or the placeholder.
  useEffect(() => {
    if (committedCommander && value === committedCommander) {
      setSelectedImage(preferenceArtUrl || artUrl);
    } else if (!value && defaultCommander && defaultArtUrl) {
      setSelectedImage(defaultArtUrl);
    } else {
      setSelectedImage(null);
    }
  }, [value, committedCommander, artUrl, preferenceArtUrl, defaultCommander, defaultArtUrl]);

  // Load last played commander suggestions
  useEffect(() => {
    if (playerId && playerId !== "__add__" && playerId !== "") {
      const sortedGames = [...gamesData].sort((a: any, b: any) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
      const commanders: { name: string; partnerCommander?: string }[] = [];
      let lastCommander: string | null = null;
      
      for (const game of sortedGames) {
        const playerInGame = (game.players as any[]).find((p: any) => p.playerId === playerId);
        if (playerInGame) {
          // Handle commander as string or array
          const isArray = Array.isArray(playerInGame.commander);
          let cmdString = isArray ? playerInGame.commander[0] : playerInGame.commander;
          let partnerCmd = isArray && playerInGame.commander.length > 1 ? playerInGame.commander[1] : undefined;

          // Drop the "Unknown"/empty placeholder so it never shows up as a
          // suggestion or the last-played default. Skip the play entirely if
          // it has no real primary commander; clear a placeholder partner.
          if (!isRealCommander(cmdString)) continue;
          if (!isRealCommander(partnerCmd)) partnerCmd = undefined;

          // Normalize partner order (sort alphabetically to ensure consistent ordering)
          if (partnerCmd) {
            const sorted = [cmdString, partnerCmd].sort();
            cmdString = sorted[0];
            partnerCmd = sorted[1];
          }
          
          // Set the first one we find as the last played
          if (!lastCommander) {
            lastCommander = cmdString;
            setLastPlayedCommander(cmdString);
          }
          // Collect all unique commanders this player has played (with normalized partners)
          if (!commanders.find(c => c.name === cmdString && c.partnerCommander === partnerCmd)) {
            commanders.push({ name: cmdString, partnerCommander: partnerCmd });
          }
        }
      }
      setPreviousCommanders(commanders);
    } else {
      setPreviousCommanders([]);
      setLastPlayedCommander(null);
    }
  }, [playerId, gamesData]);

  const searchCommanders = (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setNoResults(false);
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    // Cancel any request still in flight and mark this as the current query.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    latestQueryRef.current = trimmed;

    setNoResults(false);
    setLoading(true);
    scryfallFetch(
      `https://api.scryfall.com/cards/search?q=is:commander+${encodeURIComponent(trimmed)}`,
      { signal: controller.signal }
    )
      .then(res => res.json())
      .then(data => {
        // A slower, older response may resolve after a newer one — ignore it so
        // it can't overwrite the results the user is actually waiting on.
        if (latestQueryRef.current !== trimmed) return;
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          setResults(data.data.slice(0, 10).map((card: any) => ({
            name: card.name,
            id: card.id,
            image: card.image_uris?.small || card.image_uris?.normal || undefined
          })));
          setNoResults(false);
          // Don't pop the list back open if the field was dismissed mid-search.
          if (isFocusedRef.current) setShowDropdown(true);
        } else {
          // Scryfall returns a 404 / empty set when nothing matches.
          setResults([]);
          setNoResults(true);
          if (isFocusedRef.current) setShowDropdown(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        // An aborted request isn't a failure — a newer search supersedes it.
        if (err?.name === "AbortError") return;
        if (latestQueryRef.current !== trimmed) return;
        setResults([]);
        setLoading(false);
      });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // This value change is from typing — the sync effect must not treat it as a
    // committed commander and fetch art for it. (Art preview updates on select.)
    isTypingRef.current = true;
    onChange(val);

    // Any prior search is now irrelevant — drop its timer and in-flight request.
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    abortRef.current?.abort();

    // If input is empty, show previous commanders
    if (!val.trim()) {
      setResults(previousCommanders.map(cmd => ({ name: cmd.name, id: cmd.name, partnerCommander: cmd.partnerCommander, image: getImageCache(cmd.name)?.art || undefined })));
      setNoResults(false);
      setShowDropdown(true);
      setLoading(false);
      return;
    }

    // User has started typing
    setHasStartedTyping(true);

    // Below the minimum, don't query or show a stale list — just wait.
    if (val.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setNoResults(false);
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    // Open the menu and show the loading skeleton right away, so the dropdown
    // doesn't blink out during the debounce and the search feels responsive.
    setNoResults(false);
    setLoading(true);
    setShowDropdown(true);

    // Debounce so we only query once the user pauses, not on every keystroke.
    debounceTimer.current = setTimeout(() => {
      searchCommanders(val);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleSelect = (cardName: string, partnerCommander?: string) => {
    // A real card was chosen — commit it so the art preview fetches/loads for
    // it (this is the only place a typed-into field gets art).
    isTypingRef.current = false;
    setCommittedCommander(cardName);
    onChange(cardName);
    setShowDropdown(false);
    setResults([]);
    setNoResults(false);
    // Call the partner select callback if partner commander exists
    if (partnerCommander && onPartnerSelect) {
      onPartnerSelect(partnerCommander);
    }
  };

  const handleInputFocus = () => {
    isFocusedRef.current = true;
    // Show previous commanders when input is focused and empty
    if (!value.trim() && previousCommanders.length > 0) {
      setResults(previousCommanders.map(cmd => ({ name: cmd.name, id: cmd.name, partnerCommander: cmd.partnerCommander, image: getImageCache(cmd.name)?.art || undefined })));
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    // Dismiss the suggestions when the field loses focus — e.g. tapping the
    // mobile keyboard's Done/return — even if nothing was selected. Options
    // select on the row's onMouseDown, which fires before this blur, so taps
    // still register. Also cancel any pending debounced search so it can't
    // re-open the list after the keyboard is gone.
    isFocusedRef.current = false;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    abortRef.current?.abort();
    setShowDropdown(false);
    setLoading(false);
  };

  const handleInputClick = () => {
    // When clicking an empty input, show previous commanders
    if (!value.trim() && previousCommanders.length > 0) {
      setResults(previousCommanders.map(cmd => ({ name: cmd.name, id: cmd.name, partnerCommander: cmd.partnerCommander, image: getImageCache(cmd.name)?.art || undefined })));
      setShowDropdown(true);
    }
  };

  return (
    <div className="commander-autocomplete">
      {/* Commander image preview — shimmers in instead of popping. */}
      <div className="commander-preview-slot">
        <ShimmerImage
          src={selectedImage || ''}
          alt={committedCommander || defaultCommander || 'commander'}
          title={committedCommander || defaultCommander || undefined}
          style={{ cursor: onCardClick ? 'pointer' : 'default' }}
          fallback={<div className="game-row-commander-img-placeholder">?</div>}
          onClick={(e) => {
            // This img sits inside the field's <label>, so a tap would otherwise
            // activate the label and focus the commander text input — popping the
            // mobile keyboard over the art selector. Cancel that default focus.
            e.preventDefault();
            if (onCardClick) {
              // Use the committed commander if there is one, else the default.
              const commanderName = committedCommander || defaultCommander;
              const imageUrl = committedCommander ? fullImageUrl : defaultFullImageUrl;
              if (commanderName) {
                onCardClick({ name: commanderName, imageUrl, playerId });
              }
            }
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <input
          ref={refs.setReference}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onClick={handleInputClick}
          placeholder={hasStartedTyping ? "Find commander" : (lastPlayedCommander || "Commander name")}
          autoComplete="off"
          className="field-input"
          style={{ width: '100%' }}
          {...getReferenceProps()}
        />
        {/* One floating menu for every state — loading skeleton, results, or
            "no results" — so it never blinks out or jumps between different
            boxes as a search resolves. */}
        {showDropdown && (loading || results.length > 0 || noResults) && (
          <FloatingPortal>
            <ul
              className="autocomplete-dropdown"
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                margin: 0,
                padding: 0,
                listStyle: 'none'
              }}
              {...getFloatingProps()}
            >
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <li key={`sk-${i}`} className="ac-row ac-skeleton-row" aria-hidden="true">
                    <span className="ac-thumb skeleton" />
                    <span className="ac-skel-label skeleton skeleton-bar" />
                  </li>
                ))
              ) : results.length > 0 ? (
                results.map((card, idx) => (
                  <li
                    key={`${card.id}|${card.partnerCommander ?? ''}|${idx}`}
                    className="ac-row"
                    onMouseDown={() => handleSelect(card.name, card.partnerCommander)}
                  >
                    <span className="ac-thumb">
                      {card.image ? (
                        <ShimmerImage src={card.image} alt={card.name} />
                      ) : (
                        <span className="ac-thumb-empty" aria-hidden="true" />
                      )}
                    </span>
                    <span className="ac-row-label">{card.name}{card.partnerCommander ? ` // ${card.partnerCommander}` : ''}</span>
                  </li>
                ))
              ) : (
                <li className="ac-row ac-empty">No commanders found</li>
              )}
            </ul>
          </FloatingPortal>
        )}
      </div>
    </div>
  );
};

type NewGameProps = {
  onSubmit: (gameData: any) => void | Promise<void>;
  onCancel?: () => void;
  initialData?: {
    dateCreated: string;
    notes: string;
    players: Array<{
      playerId: string;
      commander: string;
      placement: number;
    }>;
  };
};

interface PlayerField {
  playerId: string;
  commander: string;
  partnerCommander: string;
  placement: number;
  addNew: boolean;
  newName: string;
  lastPlayedCommander?: string;
}

const NewGame: React.FC<NewGameProps> = ({ onSubmit, onCancel, initialData }) => {
  const players = usePlayers();
  const { games: gamesData } = useGames();
  // Commander suggestions draw on a player's full history across every session,
  // not just the active one. Player rotation below still uses the current session.
  const { games: allGamesData } = useAllGames();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 8;
  const DEFAULT_PLAYERS = 4;
  // Helper to get the last played commander for a specific player (across all sessions)
  function getLastPlayedCommander(playerId: string) {
    if (!playerId) return '';
    const sortedGames = [...allGamesData].sort((a: any, b: any) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
    for (const game of sortedGames) {
      const playerInGame = (game.players as any[]).find((p: any) => p.playerId === playerId);
      if (playerInGame) {
        // The first commander (of a partner pair, or the single commander).
        const primary = Array.isArray(playerInGame.commander)
          ? playerInGame.commander[0]
          : playerInGame.commander;
        // Skip the "Unknown"/empty placeholder and keep looking back for a
        // real commander to suggest as the default.
        if (isRealCommander(primary)) return primary;
      }
    }
    return '';
  }

  // Helper to get the 4 players who played least recently
  function getLeastRecentlyPlayedPlayers() {
    // Map of playerId to last played date
    const lastPlayed: Record<string, string> = {};
    // Go through games in reverse chronological order
    const sortedGames = [...gamesData].sort((a: any, b: any) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
    for (const game of sortedGames) {
      for (const p of game.players) {
        if (!lastPlayed[p.playerId]) {
          lastPlayed[p.playerId] = game.dateCreated;
        }
      }
    }
    // All player IDs from the player list
    const allPlayers = players.map(p => p.id);
    // Sort by last played date (oldest first, undefined last)
    const sortedByLastPlayed = allPlayers
      .map(pid => ({
        id: pid,
        last: lastPlayed[pid] || ''
      }))
      .sort((a, b) => {
        if (!a.last && !b.last) return 0;
        if (!a.last) return -1;
        if (!b.last) return 1;
        return new Date(a.last).getTime() - new Date(b.last).getTime();
      });
    return sortedByLastPlayed.slice(0, DEFAULT_PLAYERS).map(p => p.id);
  }

  const [playerFields, setPlayerFields] = useState<PlayerField[]>([]);

  // On mount, set default player fields to least recently played or use initialData
  useEffect(() => {
    if (initialData) {
      // Initialize from provided data
      setPlayerFields(
        initialData.players.map(p => {
          // Handle both string and array commanders
          const commanders = Array.isArray(p.commander) ? p.commander.sort() : [p.commander];
          return {
            playerId: p.playerId,
            commander: commanders[0] || '',
            partnerCommander: commanders[1] || '',
            placement: p.placement,
            addNew: false,
            newName: ''
          };
        })
      );
      setNotes(initialData.notes);
    } else {
      // Set default player fields to least recently played
      const defaultPlayers = getLeastRecentlyPlayedPlayers();
      setPlayerFields(
        Array(DEFAULT_PLAYERS).fill(null).map((_, i) => {
          const playerId = defaultPlayers[i] || '';
          return {
            playerId,
            commander: '',
            partnerCommander: '',
            placement: i + 1,
            addNew: false,
            newName: '',
            lastPlayedCommander: getLastPlayedCommander(playerId)
          };
        })
      );
    }
    // eslint-disable-next-line
  }, [players.length, initialData]);

  // The all-sessions game history loads asynchronously. Once it arrives,
  // backfill each field's last-played-commander hint without disturbing any
  // player/commander the user has already chosen.
  useEffect(() => {
    if (initialData) return;
    setPlayerFields(fields =>
      fields.map(f =>
        f.playerId
          ? { ...f, lastPlayedCommander: getLastPlayedCommander(f.playerId) }
          : f
      )
    );
    // eslint-disable-next-line
  }, [allGamesData]);

  const [notes, setNotes] = useState("");
  const [selectedCard, setSelectedCard] = useState<{ name: string; imageUrl: string; playerId?: string } | null>(null);

  const handlePlayerChange = (idx: number, playerId: string) => {
    // "+ Add new player" isn't a real player id — handle it as a fresh entry.
    if (playerId === "__add__") {
      setPlayerFields(fields => fields.map((f, i) =>
        i === idx
          ? { ...f, playerId, addNew: true, newName: '', commander: '', partnerCommander: '', lastPlayedCommander: '' }
          : f
      ));
      return;
    }

    setPlayerFields(fields => {
      // If the chosen player already occupies another slot, swap the two
      // players between slots rather than allowing a duplicate. Placement
      // belongs to the slot (Player 1 = Winner, etc.) and stays put; the
      // player and their commander travel together.
      const otherIdx = fields.findIndex((f, i) => i !== idx && f.playerId === playerId);
      if (otherIdx !== -1) {
        const carry = (f: PlayerField) => ({
          playerId: f.playerId,
          commander: f.commander,
          partnerCommander: f.partnerCommander,
          addNew: f.addNew,
          newName: f.newName,
          lastPlayedCommander: f.lastPlayedCommander,
        });
        const here = carry(fields[idx]);
        const there = carry(fields[otherIdx]);
        return fields.map((f, i) => {
          if (i === idx) return { ...f, ...there };
          if (i === otherIdx) return { ...f, ...here };
          return f;
        });
      }

      // Otherwise it's a normal pick of a player not yet in the game.
      const lastCommander = getLastPlayedCommander(playerId);
      return fields.map((f, i) =>
        i === idx
          ? { ...f, playerId, addNew: false, lastPlayedCommander: lastCommander, commander: '', partnerCommander: '' }
          : f
      );
    });
  };

  const handleCommanderChange = (idx: number, commander: string) => {
    setPlayerFields(fields => fields.map((f, i) =>
      i === idx ? { ...f, commander } : f
    ));
  };

  const handlePartnerCommanderChange = (idx: number, partnerCommander: string) => {
    setPlayerFields(fields => fields.map((f, i) =>
      i === idx ? { ...f, partnerCommander } : f
    ));
  };

  const handlePlacementChange = (idx: number, placement: number) => {
    setPlayerFields(fields => fields.map((f, i) =>
      i === idx ? { ...f, placement } : f
    ));
  };

  const handleNewPlayerName = (idx: number, name: string) => {
    setPlayerFields(fields => fields.map((f, i) =>
      i === idx ? { ...f, newName: name, playerId: name } : f
    ));
  };

  const addPlayerField = () => {
    if (playerFields.length < MAX_PLAYERS) {
      setPlayerFields([...playerFields, { 
        playerId: '', 
        commander: '',
        partnerCommander: '',
        placement: playerFields.length + 1,
        addNew: false, 
        newName: '',
        lastPlayedCommander: ''
      }]);
    }
  };
  
  const removePlayerField = (idx: number) => {
    if (playerFields.length > MIN_PLAYERS) {
      const newFields = playerFields.filter((_, i) => i !== idx);
      // Reassign placements after removal
      setPlayerFields(newFields.map((f, i) => ({ ...f, placement: i + 1 })));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all players have required fields
    // If commander is empty but lastPlayedCommander exists, use that
    const validPlayers = playerFields.filter(f => {
      const commander = f.commander || f.lastPlayedCommander;
      return f.playerId && commander;
    });
    if (validPlayers.length < MIN_PLAYERS) {
      alert(`Please add at least ${MIN_PLAYERS} players with commanders`);
      return;
    }

    // Placements may be shared — two (or more) players can tie for the same
    // finish, so no uniqueness check here.

    // Build game data matching the backend structure
    const gameData = {
      players: validPlayers.map(f => {
        // Use commander if set, otherwise use lastPlayedCommander
        const primaryCommander = f.commander || f.lastPlayedCommander || '';
        // Use array for partners, string for single commander
        if (f.partnerCommander) {
          // Normalize partner order (sort alphabetically for consistency)
          const partners = [primaryCommander, f.partnerCommander].sort();
          return {
            playerId: f.playerId,
            commander: partners,
            placement: f.placement
          };
        }
        return {
          playerId: f.playerId,
          commander: primaryCommander,
          placement: f.placement
        };
      }),
      notes: notes.trim(),
      dateCreated: initialData ? initialData.dateCreated : new Date().toISOString()
    };
    
    // Sort players by placement (ascending - 1st place first)
    gameData.players.sort((a, b) => a.placement - b.placement);
    
    setIsSubmitting(true);
    Promise.resolve(onSubmit(gameData)).finally(() => {
      setIsSubmitting(false);
    });
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : playerId;
  };

  return (
    <>
      <form className="new-game-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3 className="section-title">Players & Results</h3>
        <div className="players-list">
          {playerFields.map((field, idx) => (
            <div key={idx} className="player-entry">
              <div className="player-entry-header">
                <span className="player-number">Player {idx + 1}</span>
                {playerFields.length > MIN_PLAYERS && (
                  <button
                    type="button"
                    className="remove-player-btn"
                    onClick={() => removePlayerField(idx)}
                    aria-label={`Remove Player ${idx + 1}`}
                  >
                    ×
                  </button>
                )}
              </div>
              
              <div className="player-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <label className="field-label" style={{ marginBottom: 0 }}>
                      Player Name
                      {!field.addNew ? (
                        <StaticDropdown
                          value={field.playerId}
                          onChange={(id) => handlePlayerChange(idx, id)}
                          options={[
                            ...players.map(p => ({ id: p.id, label: p.name })),
                            { id: "__add__", label: "+ Add new player…" }
                          ]}
                          placeholder="Select player"
                        />
                      ) : (
                        <input
                          type="text"
                          value={field.newName}
                          onChange={e => handleNewPlayerName(idx, e.target.value)}
                          placeholder="Enter new player name"
                          required
                          className="field-input"
                          onBlur={() => {
                            if (field.newName) handlePlayerChange(idx, field.newName);
                          }}
                        />
                      )}
                    </label>
                  </div>
                  <div style={{ width: '100px', minWidth: '80px', position: 'relative' }}>
                    <label className="field-label" style={{ marginBottom: 0 }}>
                      Placement
                      <StaticDropdown
                        value={String(field.placement)}
                        onChange={(val) => handlePlacementChange(idx, parseInt(val))}
                        options={Array.from({ length: playerFields.length }, (_, i) => {
                          const placement = i + 1;
                          let label = String(placement);
                          if (placement === 1) label = 'Winner';
                          else if (placement === 2) label = '2nd';
                          else if (placement === 3) label = '3rd';
                          else label = `${placement}th`;
                          return { id: String(placement), label };
                        })}
                        placeholder="Placement"
                      />
                    </label>
                  </div>
                </div>
                <label className="field-label" style={{ position: 'relative', marginTop: '0.5rem' }}>
                  Commander
                  <CommanderAutocomplete
                    value={field.commander}
                    onChange={val => handleCommanderChange(idx, val)}
                    playerId={field.playerId}
                    games={allGamesData}
                    defaultCommander={field.lastPlayedCommander}
                    onCardClick={setSelectedCard}
                    onPartnerSelect={(partner) => {
                      // Auto-fill partner commander when selecting a commander with partner history
                      if (!field.partnerCommander || field.partnerCommander.trim() === '') {
                        handlePartnerCommanderChange(idx, partner);
                      }
                    }}
                  />
                </label>
                {field.partnerCommander && (
                  <label className="field-label" style={{ position: 'relative', marginTop: '0.5rem' }}>
                    Partner Commander
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <CommanderAutocomplete
                        value={field.partnerCommander}
                        onChange={val => handlePartnerCommanderChange(idx, val)}
                        playerId={field.playerId}
                        games={allGamesData}
                        onCardClick={setSelectedCard}
                      />
                      <button
                        type="button"
                        onClick={() => handlePartnerCommanderChange(idx, '')}
                        className="remove-player-btn"
                        title="Remove partner commander"
                      >
                        ×
                      </button>
                    </div>
                  </label>
                )}
                {!field.partnerCommander && (
                  <button
                    type="button"
                    onClick={() => handlePartnerCommanderChange(idx, ' ')}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      background: 'transparent',
                      border: '1.5px dashed var(--border)',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                    }}
                  >
                    + Add Partner Commander
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {playerFields.length < MAX_PLAYERS && (
          <button type="button" className="add-player-btn" onClick={addPlayerField}>
            + Add Another Player
          </button>
        )}
      </div>

      <div className="form-section">
        <label className="field-label">
          Game Notes (Optional)
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about this game (e.g., 'Epic 3-hour battle!', 'Anson pulled off an amazing combo win')..."
            className="field-input notes-input"
          />
        </label>
      </div>

      <FormActions
        submitLabel={initialData ? 'Save Changes' : 'Create Game'}
        loadingText={initialData ? 'Saving...' : 'Creating...'}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
      />
    </form>
    
    <CardModal
      isOpen={!!selectedCard}
      imageUrl={selectedCard?.imageUrl || ""}
      cardName={selectedCard?.name || ""}
      playerId={selectedCard?.playerId}
      onClose={() => setSelectedCard(null)}
      onArtSelect={(variant) => {
        // After selecting art, refresh the component to show updated preference
        if (selectedCard) {
          setSelectedCard({ ...selectedCard });
        }
      }}
    />
    </>
  );
};

export default NewGame;
