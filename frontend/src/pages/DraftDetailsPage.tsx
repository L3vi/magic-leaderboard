import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import DetailsPageShell from "../components/DetailsPageShell/DetailsPageShell";
import DraftDetails from "../components/Drafts/DraftDetails";
import { useCubeEvent } from "../context/CubeEventContext";

const DraftDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { draftId } = useParams<{ draftId: string }>();
  const { event } = useCubeEvent();

  const draft = event?.drafts.find(d => d.id === draftId);
  const draftDisplayName = React.useMemo(() => {
    if (!event || !draft) return draftId || "Draft";
    const cube = event.cubes.find(c => c.id === draft.cubeId);
    const cubeDraftNum = event.drafts
      .filter(d => d.cubeId === draft.cubeId)
      .findIndex(d => d.id === draftId) + 1;
    return `${cube?.name || draft.cubeId} Draft #${cubeDraftNum}`;
  }, [event, draft, draftId]);

  return (
    <DetailsPageShell
      title={draftDisplayName}
      onClose={() => navigate("/drafts")}
    >
      {draftId && <DraftDetails draftId={draftId} />}
    </DetailsPageShell>
  );
};

export default DraftDetailsPage;
