import React, { useState } from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import { useCommanderVariants, CardVariant, clearCommanderCache } from "../../hooks/useCommanderArt";
import { useArtPreferenceRefresh } from "../../context/ArtPreferenceContext";
import {
  getCommanderArtPreference,
  saveCommanderArtPreference,
} from "../../services/playerArtPreferences";
import CommanderArtSelector from "./CommanderArtSelector";
import "./CardModal.css";

interface CardModalProps {
  isOpen: boolean;
  imageUrl: string;
  cardName: string;
  onClose: () => void;
  playerId?: string;
  onArtSelect?: (variant: CardVariant) => void;
}

const CardModal: React.FC<CardModalProps> = ({ 
  isOpen, 
  imageUrl, 
  cardName, 
  onClose,
  playerId,
  onArtSelect,
}) => {
  const [displayedImageUrl, setDisplayedImageUrl] = useState(imageUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPreference, setCurrentPreference] = useState<any>(undefined);
  const variants = useCommanderVariants(cardName);
  const { triggerRefresh } = useArtPreferenceRefresh();

  // Load current saved preference for this player's commander
  React.useEffect(() => {
    if (playerId && cardName) {
      getCommanderArtPreference(playerId, cardName).then(preference => {
        setCurrentPreference(preference);
        // If preference exists, use that image instead of the default
        if (preference && preference.artUrl) {
          setDisplayedImageUrl(preference.artUrl);
        }
      });
    }
  }, [playerId, cardName]);

  const currentPreferenceId = currentPreference?.variantId;

  const swipeHandlers = useSwipeable({
    onSwipedDown: () => {
      onClose();
    },
    trackTouch: true,
    trackMouse: false,
  });

  React.useEffect(() => {
    setDisplayedImageUrl(imageUrl);
  }, [imageUrl, isOpen]);

  const handleVariantSelect = (variant: CardVariant) => {
    setDisplayedImageUrl(variant.full);
  };

  const handleSaveVariant = async (variant: CardVariant) => {
    if (!playerId) {
      console.warn("No playerId provided, cannot save art preference");
      return;
    }

    try {
      setIsSaving(true);
      console.log(`🎨 Saving art variant for ${cardName}...`);
      
      // Save to Firebase
      await saveCommanderArtPreference(playerId, cardName, variant);

      console.log(`✅ Art preference saved successfully`);

      // Clear cache to force re-fetch with new preference
      clearCommanderCache(cardName);

      // Trigger refresh in all components using the preference hooks
      triggerRefresh();

      // Call the callback if provided
      onArtSelect?.(variant);

      // Close modal after successful save
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 300);
    } catch (error) {
      console.error("❌ Failed to save art preference:", error);
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

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
        animate={{ opacity: variants.length > 0 && playerId ? 0 : 1 }}
        transition={{ duration: 0.1 }}
        style={{ pointerEvents: variants.length > 0 && playerId ? "none" : "auto" }}
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
          src={displayedImageUrl} 
          alt={cardName} 
          className="card-modal-image"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, delay: 0.05 }}
          key={displayedImageUrl}
        />
        {variants.length > 0 && playerId && (
          <CommanderArtSelector
            variants={variants}
            currentVariantId={currentPreferenceId}
            onVariantSelect={handleVariantSelect}
            onSave={handleSaveVariant}
            onCancel={handleCancel}
            isLoading={variants.length === 0}
            isSaving={isSaving}
          />
        )}
      </motion.div>
    </motion.div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default CardModal;
