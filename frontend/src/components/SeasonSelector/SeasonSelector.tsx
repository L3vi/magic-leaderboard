import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import StaticDropdown, { DropdownOption } from '../StaticDropdown/StaticDropdown';
import './SeasonSelector.css';

const NEW_SESSION = '__new_session__';

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

const GearIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.4 13a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Season switcher in the header. The trigger shows the active season's name;
 * the menu lists every season (current one badged) with game/player counts,
 * plus a "+ New season" entry that opens the create-session page.
 */
const SeasonSelector: React.FC = () => {
  const { sessions, activeSession, setActiveSession } = useSession();
  const navigate = useNavigate();

  if (!sessions || sessions.length === 0) return null;

  const visible = sessions.filter((s) => !s.archived);
  const current = visible.find((s) => s.id === activeSession) ?? visible[0] ?? sessions[0];

  const options: DropdownOption[] = visible.map((s) => ({
    id: s.id,
    label: s.name,
    sublabel: `${count(s.gameCount ?? 0, 'game')} · ${count(s.players?.length ?? 0, 'player')}`,
  }));
  options.push({ id: NEW_SESSION, label: '+ New season' });

  const handleChange = (id: string) => {
    if (id === NEW_SESSION) navigate('/new-session');
    else setActiveSession(id);
  };

  return (
    <div className="season-switcher-group">
      <StaticDropdown
        value={current.id}
        onChange={handleChange}
        options={options}
        placement="bottom-end"
        matchTriggerWidth={false}
        menuMinWidth={248}
        ariaLabel={`Selected season: ${current.name}. Tap to switch season.`}
        triggerClassName="season-switch"
        renderTrigger={({ open }) => (
          <>
            <span className="season-switch__name">{current.name}</span>
            <ChevronIcon open={open} />
          </>
        )}
      />
      <button
        type="button"
        className="season-gear"
        onClick={() => navigate('/manage-season')}
        aria-label={`Manage ${current.name}`}
        title={`Manage ${current.name}`}
      >
        <GearIcon />
      </button>
    </div>
  );
};

export default SeasonSelector;
