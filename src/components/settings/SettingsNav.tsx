import { SETTINGS_NAV, type SettingsNavItem } from './settingsSections'

function highlight(label: string, query: string) {
  if (!query) return label
  const i = label.toLowerCase().indexOf(query.toLowerCase())
  if (i === -1) return label
  return (
    <>
      {label.slice(0, i)}
      <mark className="rounded-sm bg-accent-100 text-accent-800">{label.slice(i, i + query.length)}</mark>
      {label.slice(i + query.length)}
    </>
  )
}

const matches = (item: SettingsNavItem, query: string) =>
  `${item.label} ${item.keywords}`.toLowerCase().includes(query.toLowerCase())

export default function SettingsNav({
  activeId,
  onSelect,
  query,
}: {
  activeId: string
  onSelect: (id: string) => void
  query: string
}) {
  const q = query.trim()
  const groups = q
    ? SETTINGS_NAV.map((g) => ({ ...g, items: g.items.filter((item) => matches(item, q)) })).filter(
        (g) => g.items.length > 0,
      )
    : SETTINGS_NAV

  if (q && groups.length === 0) {
    return <p className="px-3 py-6 text-center text-xs text-gray-400">No settings match "{query}"</p>
  }

  return (
    <nav className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = item.id === activeId
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onSelect(item.id)}
                    className={`group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ${
                      isActive ? 'bg-primary-50 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-500 transition-opacity duration-150 ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <item.icon
                      className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                        isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                      strokeWidth={1.75}
                    />
                    <span className="truncate">{highlight(item.label, q)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
