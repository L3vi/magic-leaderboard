import React from "react";
import ReactDOM from "react-dom";
import "./CardModal.css";

interface CardModalProps {
  isOpen: boolean;
  imageUrl: string;
  cardName: string;
  onClose: () => void;
}

const CardModal: React.FC<CardModalProps> = ({ isOpen, imageUrl, cardName, onClose }) => {
  React.useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };

    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscapeKey, true);
      return () => {
        document.body.style.overflow = "unset";
        window.removeEventListener("keydown", handleEscapeKey, true);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="card-modal-overlay" onClick={onClose}>
      <div className="card-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="card-modal-close" onClick={onClose} role="button" tabIndex={-1} aria-label="Close card">
          ✕
        </div>
        <img src={imageUrl} alt={cardName} className="card-modal-image" />
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default CardModal;
