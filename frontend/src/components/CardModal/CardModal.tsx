import React from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import "./CardModal.css";

interface CardModalProps {
  isOpen: boolean;
  imageUrl: string;
  cardName: string;
  onClose: () => void;
}

const CardModal: React.FC<CardModalProps> = ({ isOpen, imageUrl, cardName, onClose }) => {
  const swipeHandlers = useSwipeable({
    onSwipedDown: () => {
      onClose();
    },
    trackTouch: true,
    trackMouse: false,
  });

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
    <motion.div 
      className="card-modal-overlay" 
      onClick={onClose}
      {...swipeHandlers}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      <motion.div 
        className="card-modal-close" 
        onClick={onClose} 
        role="button" 
        tabIndex={-1} 
        aria-label="Close card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.1 }}
      >
        ✕
      </motion.div>
      <motion.div 
        className="card-modal-content" 
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
      >
        <motion.img 
          src={imageUrl} 
          alt={cardName} 
          className="card-modal-image"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, delay: 0.05 }}
        />
      </motion.div>
    </motion.div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default CardModal;
