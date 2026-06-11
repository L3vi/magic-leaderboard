import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import StaticDropdown, { DropdownOption } from '../StaticDropdown/StaticDropdown';
import './SeasonSelector.css';

const NEW_SESSION = '__new_session__';
const MANAGE = '__manage__';

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
  const newestId = visible[0]?.id;
  const current = visible.find((s) => s.id === activeSession) ?? visible[0] ?? sessions[0];

  const options: DropdownOption[] = visible.map((s) => ({
    id: s.id,
    label: s.name,
    sublabel: `${count(s.gameCount ?? 0, 'game')} · ${count(s.players?.length ?? 0, 'player')}`,
    badge: s.id === newestId ? 'Current' : undefined,
  }));
  options.push({ id: NEW_SESSION, label: '+ New season' });
  options.push({ id: MANAGE, label: '⚙ Manage current season' });

  const handleChange = (id: string) => {
    if (id === NEW_SESSION) navigate('/new-session');
    else if (id === MANAGE) navigate('/manage-season');
    else setActiveSession(id);
  };

  return (
    <StaticDropdown
      value={current.id}
      onChange={handleChange}
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
