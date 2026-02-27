import React from "react";

interface DraftRowProps {
  name: string;
  status: "in-progress" | "complete";
  matchCount: number;
  playerCount: number;
  onClick: () => void;
}

const DraftRow: React.FC<DraftRowProps> = ({ name, status, matchCount, playerCount, onClick }) => {
  return (
    <div className="draft-row" onClick={onClick} role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter") onClick(); }}>
      <div className="draft-row-info">
        <div className="draft-row-name">{name}</div>
        <div className="draft-row-meta">{playerCount} players · {matchCount} matches</div>
      </div>
      <div className={`draft-row-status ${status}`}>
        {status === "in-progress" ? "In Progress" : "Complete"}
      </div>
    </div>
  );
};

export default DraftRow;
