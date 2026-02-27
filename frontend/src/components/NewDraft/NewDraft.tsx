import React, { useState, useMemo } from "react";
import { useCubeEvent } from "../../context/CubeEventContext";
import StaticDropdown from "../StaticDropdown/StaticDropdown";
import FormActions from "../FormActions/FormActions";
import type { Draft } from "../../types";
import "./NewDraft.css";

interface NewDraftProps {
  onSubmit: (draftData: Omit<Draft, "id">) => void | Promise<void>;
  onCancel?: () => void;
}

const NewDraft: React.FC<NewDraftProps> = ({ onSubmit, onCancel }) => {
  const { event, players } = useCubeEvent();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCubeId, setSelectedCubeId] = useState(event?.cubes[0]?.id || "");
  const [playerRows, setPlayerRows] = useState<string[]>(Array(8).fill(""));

  const cubeOptions = useMemo(
    () => (event?.cubes || []).map(c => ({ id: c.id, label: c.name })),
    [event]
  );

  const playerOptions = useMemo(
    () => players.map(p => ({ id: p.id, label: p.name })),
    [players]
  );

  // Auto-generated draft name
  const draftName = useMemo(() => {
    if (!event || !selectedCubeId) return "";
    const cube = event.cubes.find(c => c.id === selectedCubeId);
    const cubeDraftCount = event.drafts.filter(d => d.cubeId === selectedCubeId).length;
    return `${cube?.name || selectedCubeId} Draft #${cubeDraftCount + 1}`;
  }, [event, selectedCubeId]);

  const addPlayerRow = () => {
    setPlayerRows([...playerRows, ""]);
  };

  const removePlayerRow = (idx: number) => {
    setPlayerRows(playerRows.filter((_, i) => i !== idx));
  };

  const updatePlayerRow = (idx: number, playerId: string) => {
    setPlayerRows(playerRows.map((p, i) => (i === idx ? playerId : p)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCubeId) {
      alert("Please select a cube.");
      return;
    }
    const validPlayers = playerRows.filter(p => p !== "");
    if (validPlayers.length < 2) {
      alert("Please add at least 2 players.");
      return;
    }
    // Check for duplicates
    const uniquePlayers = new Set(validPlayers);
    if (uniquePlayers.size !== validPlayers.length) {
      alert("Duplicate players are not allowed.");
      return;
    }

    setIsSubmitting(true);
    const draftData: Omit<Draft, "id"> = {
      cubeId: selectedCubeId,
      date: new Date().toISOString(),
      players: validPlayers,
      status: "in-progress",
    };
    Promise.resolve(onSubmit(draftData)).finally(() => setIsSubmitting(false));
  };

  return (
    <form className="new-draft-form" onSubmit={handleSubmit}>
      {/* Cube selector */}
      <div className="draft-field">
        <label className="field-label">Cube</label>
        <StaticDropdown
          value={selectedCubeId}
          onChange={setSelectedCubeId}
          options={cubeOptions}
          placeholder="Select cube"
        />
      </div>

      {/* Auto-generated name */}
      <div className="draft-field">
        <label className="field-label">Name</label>
        <div className="draft-name-display">{draftName || "Select a cube"}</div>
      </div>

      {/* Player rows */}
      <div className="draft-field">
        <label className="field-label">Players</label>
        <div className="draft-player-rows">
          {playerRows.map((playerId, idx) => (
            <div key={idx} className="draft-player-row">
              <div className="draft-player-dropdown">
                <StaticDropdown
                  value={playerId}
                  onChange={(val) => updatePlayerRow(idx, val)}
                  options={playerOptions}
                  placeholder="Select player"
                />
              </div>
              <button
                type="button"
                className="draft-remove-btn"
                onClick={() => removePlayerRow(idx)}
                aria-label={`Remove player ${idx + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="draft-add-btn" onClick={addPlayerRow}>
          + Add Player
        </button>
      </div>

      <FormActions
        variant="fixed"
        submitLabel="Create Draft"
        loadingText="Creating..."
        onCancel={onCancel}
        isSubmitting={isSubmitting}
      />
    </form>
  );
};

export default NewDraft;
