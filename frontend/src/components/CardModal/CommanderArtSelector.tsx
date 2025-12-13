import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CardVariant } from "../../hooks/useCommanderArt";
import "./CommanderArtSelector.css";

interface CommanderArtSelectorProps {
  variants: CardVariant[];
  currentVariantId?: string;
  onVariantSelect: (variant: CardVariant) => void;
  onSave: (variant: CardVariant) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isSaving?: boolean;
}

const CommanderArtSelector: React.FC<CommanderArtSelectorProps> = ({
  variants,
  currentVariantId,
  onVariantSelect,
  onSave,
  onCancel,
  isLoading = false,
  isSaving = false,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    currentVariantId
  );
  const [scrollPosition, setScrollPosition] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition((e.target as HTMLDivElement).scrollLeft);
  };

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  const handleSave = () => {
    if (selectedVariant) {
      onSave(selectedVariant);
    }
  };

  const handleVariantClick = (variant: CardVariant) => {
    setSelectedVariantId(variant.id);
    onVariantSelect(variant);
  };

  if (isLoading) {
    return (
      <div className="art-selector-container">
        <div className="art-selector-label">Loading variants...</div>
        <div className="art-selector-skeleton" />
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className="art-selector-container">
        <div className="art-selector-label">No variants available</div>
      </div>
    );
  }

  return (
    <div className="art-selector-container">
      <div className="art-selector-header">
        <div className="art-selector-label">
          Available Art Variants ({variants.length})
        </div>
        <div className="art-selector-actions">
          <button
            type="button"
            className="art-selector-btn art-selector-btn-cancel"
            onClick={onCancel}
            disabled={isSaving}
            title="Close without saving"
          >
            Cancel
          </button>
          <button
            type="button"
            className="art-selector-btn art-selector-btn-save"
            onClick={handleSave}
            disabled={!selectedVariant || selectedVariant.id === currentVariantId || isSaving}
            title={selectedVariant?.id === currentVariantId ? "Already saved" : "Save this art as default"}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <div className="art-selector-scroll" onScroll={handleScroll}>
        <div className="art-selector-grid">
          <AnimatePresence>
            {variants.map((variant, index) => (
              <motion.div
                key={variant.id}
                className={`art-variant-card ${
                  selectedVariantId === variant.id ? "selected" : ""
                }`}
                onClick={() => handleVariantClick(variant)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: Math.min(index * 0.05, 0.2),
                }}
              >
                <img
                  src={variant.art}
                  alt={`${variant.name} - ${variant.set}`}
                  className="art-variant-image"
                  loading="lazy"
                />
                <div className="art-variant-info">
                  <div className="art-variant-set">{variant.set}</div>
                  <div className="art-variant-name">{variant.name}</div>
                </div>
                {selectedVariantId === variant.id && (
                  <div className="art-variant-checkmark">✓</div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      {scrollPosition > 0 && (
        <div className="art-selector-hint">← Scroll for more →</div>
      )}
    </div>
  );
};

export default CommanderArtSelector;
