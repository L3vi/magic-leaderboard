import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import PageShell from "../components/PageShell/PageShell";
import FormActions from "../components/FormActions/FormActions";
import {
  fetchPlayers,
  fetchPlayerGameCounts,
  addPlayer,
  addSession,
} from "../services/dataService";
import type { Player } from "../types";
import "./NewSessionPage.css";

const NewSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveSession, reloadSessions } = useSession();

  const [name, setName] = useState("");
  const [pool, setPool] = useState<Player[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newPlayers, setNewPlayers] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => navigate("/players");

  // Load the player pool + how many games each has played (for sorting).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [players, gameCounts] = await Promise.all([
        fetchPlayers(),
        fetchPlayerGameCounts(),
      ]);
      if (cancelled) return;
      setPool(players);
      setCounts(gameCounts);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Most-played first, then alphabetical.
  const sortedPool = useMemo(
    () =>
      [...pool].sort(
        (a, b) =>
          (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.name.localeCompare(b.name)
      ),
    [pool, counts]
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addNewPlayer = () => {
    const n = newName.trim();
    if (!n) return;
    const existing = pool.find((p) => p.name.toLowerCase() === n.toLowerCase());
    if (existing) {
      setSelected((prev) => new Set(prev).add(existing.id));
    } else if (!newPlayers.some((x) => x.toLowerCase() === n.toLowerCase())) {
      setNewPlayers((prev) => [...prev, n]);
    }
    setNewName("");
  };

  const removeNewPlayer = (n: string) =>
    setNewPlayers((prev) => prev.filter((x) => x !== n));

  const totalSelected = selected.size + newPlayers.length;

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Give the season a name.");
      return;
    }
    if (totalSelected < 2) {
      setError("Pick at least 2 players.");
      return;
    }
    setSaving(true);
    try {
      const created = await Promise.all(newPlayers.map((n) => addPlayer(n)));
      const roster = [...selected, ...created.map((p) => p.id)];
      const session = await addSession(name, roster);
      await reloadSessions();
      setActiveSession(session.id);
      navigate("/players");
    } catch (e) {
      console.error("Failed to create session:", e);
      setError("Couldn't create the season. Please try again.");
      setSaving(false);
    }
  };

  return (
    <PageShell title="New Season" onClose={close}>
        <div className="session-form">
          <label className="session-field">
            <span className="session-field__label">Season name</span>
            <input
              className="session-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer 2026"
              autoFocus
            />
          </label>

          <div className="session-players">
            <div className="session-players__head">
              <span className="session-field__label">Players</span>
              <span className="session-players__count">{totalSelected} selected</span>
            </div>

            <div className="session-addnew">
              <input
                className="session-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Add a new player…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNewPlayer();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={addNewPlayer}
                disabled={!newName.trim()}
              >
                Add
              </button>
            </div>

            <div className="player-pick-list">
              {newPlayers.map((n) => (
                <button
                  key={`new-${n}`}
                  type="button"
                  className="player-pick selected"
                  onClick={() => removeNewPlayer(n)}
                  aria-label={`Remove new player ${n}`}
                >
                  <span className="player-pick__name">{n}</span>
                  <span className="player-pick__meta player-pick__meta--new">new</span>
                  <span className="player-pick__check" aria-hidden="true">✓</span>
                </button>
              ))}

              {sortedPool.map((p) => {
                const isSel = selected.has(p.id);
                const c = counts[p.id] ?? 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`player-pick${isSel ? " selected" : ""}`}
                    onClick={() => toggle(p.id)}
                    aria-pressed={isSel}
                  >
                    <span className="player-pick__name">{p.name}</span>
                    <span className="player-pick__meta">
                      {c} game{c === 1 ? "" : "s"}
                    </span>
                    <span className="player-pick__check" aria-hidden="true">
                      {isSel ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <div className="session-error">{error}</div>}

          <FormActions
            submitLabel="Create Season"
            loadingText="Creating…"
            submitType="button"
            onSubmit={handleCreate}
            onCancel={close}
            isSubmitting={saving}
          />
        </div>
    </PageShell>
  );
};

export default NewSessionPage;
