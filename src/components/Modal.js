import React from "react";
import "../../public/styles.css";

export default function Modal({ isOpen, onClose, children, title }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        {title && <h2 className="modal-title">{title}</h2>}
        <div className="modal-body">{children}</div>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          ×
        </button>
      </div>
    </div>
  );
}
