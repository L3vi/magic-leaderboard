import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCubeEvent } from "../../context/CubeEventContext";
import DraftRow from "./DraftRow";
import "./Drafts.css";

const Drafts: React.FC = () => {
  const navigate = useNavigate();
  const { event, loading } = useCubeEvent();

  const { inProgress, completed } = useMemo(() => {
    if (!event) return { inProgress: [], completed: [] };
    const inProgress = event.drafts
      .filter(d => d.status === "in-progress")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const completed = event.drafts
      .filter(d => d.status === "complete")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { inProgress, completed };
  }, [event]);

  const getDraftDisplayName = (draftId: string) => {
    if (!event) return draftId;
    const draft = event.drafts.find(d => d.id === draftId);
    if (!draft) return draftId;
    const cube = event.cubes.find(c => c.id === draft.cubeId);
    const cubeDraftNum = event.drafts
      .filter(d => d.cubeId === draft.cubeId)
      .findIndex(d => d.id === draftId) + 1;
    return `${cube?.name || draft.cubeId} Draft #${cubeDraftNum}`;
  };

  const getMatchCount = (draftId: string) => {
    if (!event) return 0;
    return event.matches.filter(m => m.draftId === draftId).length;
  };

  if (loading) {
    return <div className="main-section"><div className="loading">Loading...</div></div>;
  }

  if (!event || event.drafts.length === 0) {
    return (
      <div className="main-section">
        <div className="drafts-empty">
          <p>No drafts yet. Create one to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-section">
      <div className="drafts-list">
        {inProgress.map(draft => (
          <DraftRow
            key={draft.id}
            name={getDraftDisplayName(draft.id)}
            status={draft.status}
            matchCount={getMatchCount(draft.id)}
            playerCount={draft.players.length}
            onClick={() => navigate(`/drafts/${draft.id}`)}
          />
        ))}
        {completed.map(draft => (
          <DraftRow
            key={draft.id}
            name={getDraftDisplayName(draft.id)}
            status={draft.status}
            matchCount={getMatchCount(draft.id)}
            playerCount={draft.players.length}
            onClick={() => navigate(`/drafts/${draft.id}`)}
          />
        ))}
      </div>
    </div>
  );
};

export default Drafts;
