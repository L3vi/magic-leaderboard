import React, { useState } from "react";
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  offset,
  flip,
  size,
} from "@floating-ui/react";
import "./StaticDropdown.css";

interface StaticDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: { id: string; label: string }[];
  placeholder?: string;
}

const StaticDropdown: React.FC<StaticDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select an option",
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: showDropdown,
    onOpenChange: setShowDropdown,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
          });
        },
        padding: 8,
      }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  const selectedLabel = options.find((opt) => opt.id === value)?.label || "";

  const handleSelect = (id: string) => {
    onChange(id);
    setShowDropdown(false);
  };

  return (
    <div className="static-dropdown">
      <button
        ref={refs.setReference}
        type="button"
        className="dropdown-trigger field-input"
        {...getReferenceProps()}
      >
        {selectedLabel || placeholder}
      </button>
      {showDropdown && options.length > 0 && (
        <ul
          className="dropdown-menu"
          ref={refs.setFloating}
          style={{
            ...floatingStyles,
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
          {...getFloatingProps()}
        >
          {options.map((opt) => (
            <li
              key={opt.id}
              onMouseDown={() => handleSelect(opt.id)}
              className={`dropdown-item${opt.id === value ? " selected" : ""}`}
            >
              <span>{opt.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StaticDropdown;
