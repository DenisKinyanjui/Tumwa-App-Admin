import { useEffect, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import type { LayoutOutletContext } from '../layouts/AdminLayout'
import SettingsNav from '../components/settings/SettingsNav'
import { ALL_SETTINGS_ITEMS, DEFAULT_SETTINGS_SECTION } from '../components/settings/settingsSections'
import GeneralPanel from '../components/settings/panels/GeneralPanel'
import PlatformPanel from '../components/settings/panels/PlatformPanel'
import WorkingCapitalPanel from '../components/settings/panels/WorkingCapitalPanel'
import ErrandSettingsPanel from '../components/settings/panels/ErrandSettingsPanel'
import PaymentsPanel from '../components/settings/panels/PaymentsPanel'
import WalletsPanel from '../components/settings/panels/WalletsPanel'
import NotificationsPanel from '../components/settings/panels/NotificationsPanel'
import TermsPanel from '../components/settings/panels/TermsPanel'
import PrivacyPolicyPanel from '../components/settings/panels/PrivacyPolicyPanel'
import AuthenticationPanel from '../components/settings/panels/AuthenticationPanel'
import SystemInformationPanel from '../components/settings/panels/SystemInformationPanel'

const PANELS: Record<string, React.ComponentType> = {
  general: GeneralPanel,
  platform: PlatformPanel,
  'working-capital': WorkingCapitalPanel,
  'errand-settings': ErrandSettingsPanel,
  payments: PaymentsPanel,
  wallets: WalletsPanel,
  notifications: NotificationsPanel,
  terms: TermsPanel,
  privacy: PrivacyPolicyPanel,
  authentication: AuthenticationPanel,
  'system-info': SystemInformationPanel,
}

export default function Settings() {
  const { setSubtitle } = useOutletContext<LayoutOutletContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')

  const requestedSection = searchParams.get('section') ?? DEFAULT_SETTINGS_SECTION
  const activeSection = PANELS[requestedSection] ? requestedSection : DEFAULT_SETTINGS_SECTION

  useEffect(() => {
    setSubtitle('Configure platform-wide system settings.')
  }, [setSubtitle])

  const selectSection = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('section', id)
      return next
    })
  }

  // If the search narrows to a single match, jump straight to it.
  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q) return
    const matches = ALL_SETTINGS_ITEMS.filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(q))
    if (matches.length === 1 && matches[0].id !== activeSection) {
      selectSection(matches[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const ActivePanel = PANELS[activeSection]

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search settings..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <aside className="shrink-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:w-64">
          <SettingsNav activeId={activeSection} onSelect={selectSection} query={query} />
        </aside>

        <div className="min-w-0 flex-1">
          <ActivePanel />
        </div>
      </div>
    </div>
  )
}
