import React from 'react';
import { useSession } from '../../context/SessionContext';
import StaticDropdown, { DropdownOption } from '../StaticDropdown/StaticDropdown';
import './SeasonSelector.css';

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    className={`season-switch__chev${open ? ' open' : ''}`}
    width="16"
    height="16"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Season switcher that lives on the right of the header. The trigger shows the
 * active season's name; tapping it opens the list of seasons (current one
 * badged in gold). Reuses the shared StaticDropdown (the New Game player picker).
 */
const SeasonSelector: React.FC = () => {
  const { sessions, activeSession, setActiveSession } = useSession();

  if (!sessions || sessions.length === 0) return null;

  const newestId = sessions[0].id;
  const current = sessions.find((s) => s.id === activeSession) ?? sessions[0];

  const options: DropdownOption[] = sessions.map((s) => ({
    id: s.id,
    label: s.name,
    sublabel: s.description || undefined,
    badge: s.id === newestId ? 'Current' : undefined,
  }));

  return (
    <StaticDropdown
      value={current.id}
      onChange={setActiveSession}
      options={options}
      placement="bottom-end"
      matchTriggerWidth={false}
      menuMinWidth={248}
      ariaLabel={`Current season: ${current.name}. Tap to switch season.`}
      triggerClassName="season-switch"
      renderTrigger={({ open }) => (
        <>
          <span className="season-switch__name">{current.name}</span>
          <ChevronIcon open={open} />
        </>
      )}
    />
  );
};

export default SeasonSelector;
