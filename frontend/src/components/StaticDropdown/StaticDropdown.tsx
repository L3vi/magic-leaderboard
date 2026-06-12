import React, { useRef, useState } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  useClick,
  useDismiss,
  useRole,
  useListNavigation,
  useInteractions,
  FloatingFocusManager,
  FloatingPortal,
  type Placement,
} from '@floating-ui/react';
import './StaticDropdown.css';

export type DropdownOption = {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
};

type RenderTriggerArgs = {
  selected?: DropdownOption;
  open: boolean;
  placeholder: string;
};

type StaticDropdownProps = {
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  /** Floating-ui placement of the menu. Defaults to 'bottom-start'. */
  placement?: Placement;
  /** Match the menu width to the trigger width (default). Set false for a fixed-width menu. */
  matchTriggerWidth?: boolean;
  /** Min width (px) of the menu when matchTriggerWidth is false. */
  menuMinWidth?: number;
  ariaLabel?: string;
  /** Override the trigger's class. When omitted, the default field-style trigger is used. */
  triggerClassName?: string;
  triggerStyle?: React.CSSProperties;
  /** Custom trigger content. When omitted, the selected option's label (or placeholder) is shown. */
  renderTrigger?: (args: RenderTriggerArgs) => React.ReactNode;
  /**
   * Optional trailing action rendered inside each option row (left of the selected check).
   * The consumer's element should stopPropagation if it shouldn't also select the row.
   */
  renderItemAction?: (opt: DropdownOption, isSelected: boolean) => React.ReactNode;
};

/**
 * Reusable dropdown / listbox with floating-ui positioning, keyboard navigation,
 * and autocomplete-style menu. Used for player selection (New Game) and the
 * season selector. Supports rich options (sublabel + badge) and a custom trigger.
 */
const StaticDropdown: React.FC<StaticDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  placement = 'bottom-start',
  matchTriggerWidth = true,
  menuMinWidth = 220,
  ariaLabel,
  triggerClassName,
  triggerStyle,
  renderTrigger,
  renderItemAction,
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements, availableWidth, availableHeight }) {
          const desiredWidth = matchTriggerWidth
            ? rects.reference.width
            : Math.max(rects.reference.width, menuMinWidth);
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(300, availableHeight)}px`,
            maxWidth: `${availableWidth}px`,
            width: `${Math.min(desiredWidth, availableWidth)}px`,
          });
        },
        padding: 8,
      }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'listbox' });
  const selectedIndex = options.findIndex((o) => o.id === value);
  const listNav = useListNavigation(context, {
    listRef,
    activeIndex,
    selectedIndex: selectedIndex >= 0 ? selectedIndex : null,
    onNavigate: setActiveIndex,
    loop: true,
  });
  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    click,
    dismiss,
    role,
    listNav,
  ]);

  const selected = options.find((opt) => opt.id === value);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const triggerCls = triggerClassName ?? 'dropdown-trigger field-input';
  const defaultStyle: React.CSSProperties | undefined = triggerClassName
    ? undefined
    : {
        width: '100%',
        textAlign: 'left',
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        cursor: 'pointer',
      };

  return (
    <div className="static-dropdown">
      <button
        ref={refs.setReference}
        type="button"
        className={triggerCls}
        aria-label={ariaLabel}
        style={{ ...defaultStyle, ...triggerStyle }}
        {...getReferenceProps()}
      >
        {renderTrigger
          ? renderTrigger({ selected, open, placeholder })
          : selected?.label || placeholder}
      </button>

      {open && options.length > 0 && (
        <FloatingPortal>
        <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
          <ul
            className="autocomplete-dropdown"
            ref={refs.setFloating}
            style={{ ...floatingStyles, margin: 0, padding: 0, listStyle: 'none' }}
            {...getFloatingProps()}
          >
            {options.map((opt, i) => {
              const isSelected = opt.id === value;
              return (
                <li
                  key={opt.id}
                  ref={(node) => {
                    listRef.current[i] = node;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={activeIndex === i ? 0 : -1}
                  className={`sd-item${isSelected ? ' sd-item--selected' : ''}${
                    activeIndex === i ? ' sd-item--active' : ''
                  }`}
                  {...getItemProps({
                    onClick: () => handleSelect(opt.id),
                    onKeyDown: (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(opt.id);
                      }
                    },
                  })}
                >
                  <span className="sd-item-main">
                    <span className="sd-item-label">{opt.label}</span>
                    {opt.sublabel && <span className="sd-item-sublabel">{opt.sublabel}</span>}
                  </span>
                  {opt.badge && <span className="sd-badge">{opt.badge}</span>}
                  {renderItemAction?.(opt, isSelected)}
                  {isSelected && (
                    <span className="sd-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
};

export default StaticDropdown;
