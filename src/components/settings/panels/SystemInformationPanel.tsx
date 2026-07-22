import { Info } from 'lucide-react'
import SettingsInfoShell from '../SettingsInfoShell'

const FIELDS: { label: string; value: string }[] = [
  { label: 'Backend Version', value: '1.0.0' },
  { label: 'Frontend Version', value: '1.0.0' },
  { label: 'Database', value: 'MongoDB Atlas' },
  { label: 'Environment', value: import.meta.env.MODE },
  { label: 'Last Deployment', value: '—' },
]

export default function SystemInformationPanel() {
  return (
    <SettingsInfoShell
      icon={Info}
      title="System Information"
      description="Read-only details about the deployed build of this admin portal."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.label} className="rounded-xl border border-gray-100 px-4 py-3.5">
            <p className="text-xs font-medium text-gray-400">{f.label}</p>
            <p className="mt-1 text-sm font-semibold capitalize text-gray-800">{f.value}</p>
          </div>
        ))}
        <div className="rounded-xl border border-gray-100 px-4 py-3.5">
          <p className="text-xs font-medium text-gray-400">System Status</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-primary-700">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
            Operational
          </p>
        </div>
      </div>
    </SettingsInfoShell>
  )
}
