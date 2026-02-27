import React from "react";
import type { ManaColor } from "../../types";
import { MANA_COLORS } from "../../types";
import "./ColorCircles.css";

interface ColorCirclesProps {
  selected: ManaColor[];
  onChange: (colors: ManaColor[]) => void;
  size?: "sm" | "md" | "lg";
}

const COLOR_HEX: Record<ManaColor, string> = {
  W: "#fffbeb",
  U: "#0ea5e9",
  B: "#6b7280",
  R: "#ef4444",
  G: "#22c55e",
};

const COLOR_LABELS: Record<ManaColor, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

const ColorCircles: React.FC<ColorCirclesProps> = ({ selected, onChange, size = "md" }) => {
  const toggleColor = (color: ManaColor) => {
    if (selected.includes(color)) {
      onChange(selected.filter(c => c !== color));
    } else {
      onChange([...selected, color]);
    }
  };

  return (
    <div className={`color-circles color-circles-${size}`}>
      {MANA_COLORS.map(color => {
        const isSelected = selected.includes(color);
        return (
          <button
            key={color}
            type="button"
            className={`color-circle color-${color.toLowerCase()}${isSelected ? " selected" : ""}`}
            onClick={() => toggleColor(color)}
            aria-label={`${COLOR_LABELS[color]}${isSelected ? " (selected)" : ""}`}
            aria-pressed={isSelected}
            style={{
              backgroundColor: COLOR_HEX[color],
              opacity: isSelected ? 1 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
};

export default ColorCircles;
