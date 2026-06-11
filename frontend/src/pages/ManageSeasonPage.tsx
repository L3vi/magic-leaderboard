import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import PageShell from "../components/PageShell/PageShell";
import FormActions from "../components/FormActions/FormActions";
import {
  fetchPlayers,
  fetchPlayerGameCounts,
  fetchSessionPlayerIds,
  addPlayer,
  updateSession,
  deleteSession,
} from "../services/dataService";
import type { Player } from "../types";
import "./NewSessionPage.css";
import "./ManageSeasonPage.css";

const ManageSeasonPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessions, activeSession, setActiveSession, reloadSessions } = useSession();
  const close = () => navigate("/players");

  const current = sessions.find((s) => s.id === activeSession);
  const gameCount = current?.gameCount ?? 0;
  const isEmpty = gameCount === 0;

  const [name, setName] = useState("");
  const [pool, setPool] = useState<Player[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [played, setPlayed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newPlayers, setNewPlayers] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!activeSession) return;
    (async () => {
      const [players, gameCounts, sessionPlayed] = await Promise.all([
        fetchPlayers(),
        fetchPlayerGameCounts(),
        fetchSessionPlayerIds(activeSession),
      ]);
      if (cancelled) return;
      const sess = sessions.find((s) => s.id === activeSession);
      setPool(players);
      setCounts(gameCounts);
      setPlayed(sessionPlayed);
      setName(sess?.name ?? "");
      setSelected(new Set(sess?.players?.length ? sess.players : [...sessionPlayed]));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession, sessions]);

  const sortedPool = useMemo(
    () =>
      [...pool].sort(
        (a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.name.localeCompare(b.name)
      ),
    [pool, counts]
  );

  const toggle = (id: string) => {
    if (played.has(id)) return; // locked — already has games this season
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const addNew = () => {
    const n = newName.trim();
    if (!n) return;
    const existing = pool.find((p) => p.name.toLowerCase() === n.toLowerCase());
    if (existing) setSelected((prev) => new Set(prev).add(existing.id));
    else if (!newPlayers.some((x) => x.toLowerCase() === n.toLowerCase())) setNewPlayers((p) => [...p, n]);
    setNewName("");
  };

  const handleSave = async () => {
    if (!current) return;
    setError(null);
    if (!name.trim()) return setError("Season name can't be empty.");
    setBusy(true);
    try {
      const created = await Promise.all(newPlayers.map((n) => addPlayer(n)));
      const roster = [...selected, ...created.map((p) => p.id)];
      await updateSession(current.id, { name: name.trim(), players: roster });
      await reloadSessions();
      navigate("/players");
    } catch (e) {
      console.error(e);
      setError("Couldn't save changes.");
      setBusy(false);
    }
  };

  const pickNextActive = (excludeId: string) =>
    sessions.find((s) => s.id !== excludeId && !s.archived)?.id;

  const handleArchive = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await updateSession(current.id, { archived: true });
      const next = pickNextActive(current.id);
      await reloadSessions();
      if (next) setActiveSession(next);
      navigate("/players");
    } catch (e) {
      console.error(e);
      setError("Couldn't archive.");
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await deleteSession(current.id);
      const next = pickNextActive(current.id);
      await reloadSessions();
      if (next) setActiveSession(next);
      navigate("/players");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Couldn't delete.");
      setBusy(false);
    }
  };

  const archivedSessions = sessions.filter((s) => s.archived);
  const handleUnarchive = async (id: string) => {
    await updateSession(id, { archived: false });
    await reloadSessions();
  };

  return (
    <PageShell title="Manage Season" onClose={close}>
        {!current ? (
          <div className="ms-empty">No active season to manage.</div>
        ) : (
          <div className="session-form">
            <label className="session-field">
              <span className="session-field__label">Season name</span>
              <input className="session-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <div className="session-players">
              <div className="session-players__head">
                <span className="session-field__label">Players</span>
                <span className="session-players__count">{selected.size + newPlayers.length} in roster</span>
              </div>

              <div className="session-addnew">
                <input
                  className="session-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Add a new player…"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNew(); } }}
                />
                <button type="button" className="btn btn-secondary" onClick={addNew} disabled={!newName.trim()}>Add</button>
              </div>

              <div className="player-pick-list">
                {newPlayers.map((n) => (
                  <button key={`new-${n}`} type="button" className="player-pick selected" onClick={() => setNewPlayers((p) => p.filter((x) => x !== n))}>
                    <span className="player-pick__name">{n}</span>
                    <span className="player-pick__meta player-pick__meta--new">new</span>
                    <span className="player-pick__check" aria-hidden="true">✓</span>
                  </button>
                ))}
                {sortedPool.map((p) => {
                  const isSel = selected.has(p.id);
                  const locked = played.has(p.id);
                  const c = counts[p.id] ?? 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`player-pick${isSel ? " selected" : ""}${locked ? " ms-locked" : ""}`}
                      onClick={() => toggle(p.id)}
                      aria-pressed={isSel}
                      title={locked ? "Has games this season — can't be removed" : undefined}
                    >
                      <span className="player-pick__name">{p.name}</span>
                      <span className="player-pick__meta">{locked ? "in games" : `${c} game${c === 1 ? "" : "s"}`}</span>
                      <span className="player-pick__check" aria-hidden="true">{locked ? "🔒" : isSel ? "✓" : ""}</span>
                    </button>
                  );
                })}
              </div>
              <p className="ms-hint">Players who’ve already played this season are locked (🔒) — remove their games first to drop them.</p>
            </div>

            {error && <div className="session-error">{error}</div>}

            <div className="ms-danger">
              <div className="ms-danger-title">Danger zone</div>
              <div className="ms-danger-row">
                <div>
                  <div className="ms-danger-label">{isEmpty ? "Delete season" : "Archive season"}</div>
                  <div className="ms-danger-desc">
                    {isEmpty
                      ? "This season has no games, so it can be permanently deleted."
                      : `This season has ${gameCount} game${gameCount === 1 ? "" : "s"}, so it can't be deleted — archive it instead to hide it from the switcher while keeping all data.`}
                  </div>
                </div>
                {!confirming && (
                  <button
                    className={`btn btn-sm ${isEmpty ? "btn-danger" : "btn-secondary"}`}
                    onClick={() => { setError(null); setConfirming(true); }}
                    disabled={busy}
                  >
                    {isEmpty ? "Delete" : "Archive"}
                  </button>
                )}
              </div>
              {confirming && (
                <div className="ms-confirm">
                  <div className="ms-confirm-msg">
                    {isEmpty
                      ? "Permanently delete this season? This can’t be undone."
                      : "Archive this season? It’ll disappear from the switcher, but you can restore it anytime from the Archived list."}
                  </div>
                  <div className="ms-confirm-actions">
                    <button className="btn btn-tertiary btn-sm" onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
                    <button
                      className={`btn btn-sm ${isEmpty ? "btn-danger" : "btn-primary"}`}
                      onClick={isEmpty ? handleDelete : handleArchive}
                      disabled={busy}
                    >
                      {busy ? "Working…" : isEmpty ? "Yes, delete" : "Yes, archive"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {archivedSessions.length > 0 && (
              <div className="ms-archived">
                <div className="ms-danger-title">Archived</div>
                {archivedSessions.map((s) => (
                  <div key={s.id} className="ms-danger-row">
                    <div>
                      <div className="ms-danger-label">{s.name}</div>
                      <div className="ms-danger-desc">{s.gameCount ?? 0} games · {(s.players?.length ?? 0)} players</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleUnarchive(s.id)}>Unarchive</button>
                  </div>
                ))}
              </div>
            )}

            <FormActions
              submitLabel="Save changes"
              loadingText="Saving…"
              submitType="button"
              onSubmit={handleSave}
              onCancel={close}
              isSubmitting={busy}
            />
          </div>
        )}
    </PageShell>
  );
};

export default ManageSeasonPage;
